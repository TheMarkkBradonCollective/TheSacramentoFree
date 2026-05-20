# Sacramento BuyNothing Security Specification & TDD

This specification defines the access control constraints, data invariants, and spoofing tests ("The Dirty Dozen") to verify our Firestore security rules.

## Data Invariants
1. **User Identity Invariant**: A user document is indexed by their own authenticated UID (`uid == request.auth.uid`). No member can spoof, modify, or create a profile document for another user.
2. **PII Protection Invariant**: A user's private info (such as `email`) is strictly protected. Only the owner can view or read user profiles containing sensitive contact credentials.
3. **Item Creation Integrity**: Items posted MUST capture `userId == request.auth.uid`. No user can post an item on behalf of another user.
4. **Item Ownership Guard**: Only the owner of an item can update its title, description, category, or status.
5. **No Key-Tampering**: Immutable fields (such as `createdAt`, `userId`, `email`) must never be modified once created.
6. **Chat Participation Limit**: Only users specified in `participantIds` can read or write documents in a Chat thread, or create/read messages under that chat's subcollection.
7. **Identity Verification**: Since we only enable Pop-up Google Auth, any request must have authenticated email verification (`request.auth.token.email_verified == true`).

---

## The "Dirty Dozen" Payloads (Anti-Patterns)
The following malicious client-side payloads must be strictly rejected at the router level by our Firestore Security Rules:

### 1. Spoofing User profile ID on Write
**Target:** `CREATE /users/attacker-uid`
**Auth Context:** Authenticated as user ID `victim-uid`
```json
{
  "uid": "attacker-uid",
  "displayName": "Victim",
  "email": "victim@gmail.com",
  "neighborhood": "Midtown",
  "createdAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (auth.uid `victim-uid` doesn't match path `attacker-uid`).

### 2. Privilege Escalation - Email Spoofing Attack
**Target:** `CREATE /users/attacker-uid`
**Auth Context:** Authenticated as user ID `attacker-uid`, but token email is not verified (`email_verified: false`).
```json
{
  "uid": "attacker-uid",
  "displayName": "Attacker",
  "email": "malicious@gmail.com",
  "neighborhood": "Downtown",
  "createdAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (`email_verified == true` is required for standard operations).

### 3. Modifying Someone Else's Profile Bio
**Target:** `UPDATE /users/victim-uid`
**Auth Context:** Authenticated as user ID `attacker-uid`
```json
{
  "bio": "Hacked profile bio"
}
```
*Expected Result:* `PERMISSION_DENIED` (only owner or path matches auth.uid).

### 4. Overwriting profile immutable fields
**Target:** `UPDATE /users/victim-uid`
**Auth Context:** Authenticated as user ID `victim-uid`
```json
{
  "uid": "victim-uid",
  "displayName": "User",
  "email": "new-spoofed-email@gmail.com",
  "neighborhood": "Land Park",
  "createdAt": "2020-01-01T00:00:00Z"
}
```
*Expected Result:* `PERMISSION_DENIED` (modifying immutable email or createdAt fields).

### 5. Creating post on behalf of another user (Owner Spoofing)
**Target:** `CREATE /items/newItemId`
**Auth Context:** Authenticated as `attacker-uid`
```json
{
  "id": "newItemId",
  "title": "Beautiful Sofa",
  "description": "Giving away for clean space",
  "type": "giveaway",
  "category": "Furniture",
  "userId": "victim-uid",
  "userDisplayName": "Victim User",
  "userPhotoURL": "https://avatar.url",
  "neighborhood": "Midtown",
  "status": "active",
  "createdAt": "request.time",
  "updatedAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (`userId` payload value must match `request.auth.uid`).

### 6. Modifying someone else's Giving list post
**Target:** `UPDATE /items/victim-item-id`
**Auth Context:** Authenticated as `attacker-uid`
```json
{
  "title": "Maliciously Modified Title",
  "updatedAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (only `userId == request.auth.uid` can write updates).

### 7. Hijacking item creation timestamp
**Target:** `CREATE /items/newItemId`
**Auth Context:** Authenticated as `viewer-uid`
```json
{
  "id": "newItemId",
  "title": "My item",
  "userId": "viewer-uid",
  "createdAt": "2021-05-15T12:00:00Z",
  "updatedAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (`createdAt` must match rules server transaction `request.time`).

### 8. Shadow Field Pollution (The "Ghost Field" Attack)
**Target:** `UPDATE /items/item-id`
**Auth Context:** Authenticated as creator `owner-uid`
```json
{
  "title": "Update Sofa",
  "updatedAt": "request.time",
  "isFeaturedAdminItem": true
}
```
*Expected Result:* `PERMISSION_DENIED` (rule filters and enforces permitted fields with schema constraint `hasOnly`).

### 9. Scanning All Conversations (The Blanket Query Attack)
**Target:** `LIST /chats`
**Query:** No filter matching participantId
*Expected Result:* `PERMISSION_DENIED` (rules reject list reads unless query enforces target `participantIds` filtered by user's uid).

### 10. Eavesdropping on private chat thread
**Target:** `GET /chats/userA_userB`
**Auth Context:** Authenticated as user `attacker-uid` (who is not userA or userB)
*Expected Result:* `PERMISSION_DENIED` (read forbidden if uid is not in participantIds list).

### 11. Sending a spoofed message inside chat subcollection
**Target:** `CREATE /chats/userA_userB/messages/new-msg-id`
**Auth Context:** Authenticated as `attacker-uid` (not a participant)
```json
{
  "id": "new-msg-id",
  "senderId": "attacker-uid",
  "text": "Eavesdropping message",
  "createdAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (only thread participants can send messages).

### 12. Impersonating a sender inside active conversation
**Target:** `CREATE /chats/userA_userB/messages/new-msg-id`
**Auth Context:** Authenticated as `userA-uid` but writing `senderId == userB-uid`
```json
{
  "id": "new-msg-id",
  "senderId": "userB-uid",
  "text": "Are you there?",
  "createdAt": "request.time"
}
```
*Expected Result:* `PERMISSION_DENIED` (senderId must match auth.uid).
