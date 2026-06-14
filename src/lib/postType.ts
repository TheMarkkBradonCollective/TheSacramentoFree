import { PostType } from '../types';

export type ListingTypeFilter = 'all' | PostType;

export const LISTING_TYPE_FILTERS: ListingTypeFilter[] = ['all', 'giveaway', 'looking', 'trade'];

export function getPostTypeLabel(type: PostType | string | null | undefined): string {
  switch (type) {
    case 'giveaway':
      return 'Giving';
    case 'looking':
      return 'Looking for';
    case 'trade':
      return 'Trade & Barter';
    default:
      return 'Listing';
  }
}

export function getPostTypeFilterLabel(filter: ListingTypeFilter): string {
  switch (filter) {
    case 'all':
      return 'All';
    case 'giveaway':
      return 'Giving';
    case 'looking':
      return 'Looking';
    case 'trade':
      return 'Trade';
  }
}

export function getPostTypeModalTitle(type: PostType, isEditing: boolean): string {
  if (isEditing) return 'Edit listing';
  switch (type) {
    case 'giveaway':
      return 'Give something away';
    case 'looking':
      return 'Request something';
    case 'trade':
      return 'Offer a trade';
  }
}

export function getPostTypeCompletedLabel(type: PostType | string | null | undefined): string {
  switch (type) {
    case 'giveaway':
      return 'Claimed';
    case 'looking':
      return 'Fulfilled';
    case 'trade':
      return 'Traded';
    default:
      return 'Completed';
  }
}

export function getPostTypeBadgeClass(type: PostType | string | null | undefined): string {
  switch (type) {
    case 'giveaway':
      return 'sbn-badge-give';
    case 'looking':
      return 'sbn-badge-ask';
    case 'trade':
      return 'sbn-badge-trade';
    default:
      return 'sbn-badge-ask';
  }
}

export function getPostTypeMapLabel(type: PostType | string | null | undefined): string {
  switch (type) {
    case 'giveaway':
      return '🎁 GIFT';
    case 'looking':
      return '🔍 ASK';
    case 'trade':
      return '🔄 TRADE';
    default:
      return '📌 POST';
  }
}

export function getPostTypeMapDetailLabel(type: PostType | string | null | undefined): string {
  switch (type) {
    case 'giveaway':
      return '🎁 GIFT OFFER';
    case 'looking':
      return '🔍 ASK';
    case 'trade':
      return '🔄 TRADE OFFER';
    default:
      return '📌 LISTING';
  }
}

export function getOwnerCompletedActionLabel(type: PostType): string {
  switch (type) {
    case 'giveaway':
      return 'Mark claimed';
    case 'looking':
      return 'Mark fulfilled';
    case 'trade':
      return 'Mark traded';
  }
}
