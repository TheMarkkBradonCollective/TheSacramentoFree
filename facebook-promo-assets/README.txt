The Sacramento Free — Facebook posts
====================================

Ready-to-post pictures for the Facebook timeline (not the 30-second video ad).

Lifestyle posts (current brand — use these for regular posts):
  posts/*.jpg
  Captions: posts/POST-TODAY.txt

Newspaper ad (this look is for that ad only — do not use on other posts):
  newspaper-ad/newspaper-ad-feed.jpg
  Caption: newspaper-ad/CAPTION.txt
  Zip: public/downloads/newspaper-ad.zip

Lifestyle zip: public/downloads/facebook-posts.zip
After deploy:
  https://www.sacramentobuynothing.com/downloads/facebook-posts.zip
  https://www.sacramentobuynothing.com/downloads/newspaper-ad.zip

Fictional demo neighbors only — do not post live member photos.

Rebuild:
  npm run facebook:posts
  npm run facebook:newspaper-ad
