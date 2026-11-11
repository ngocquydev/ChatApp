import assert from 'node:assert/strict';
import test from 'node:test';
import { externalShareableVideoUrl, nextLoveReaction, videoShareLinks } from '../src/components/explore/shortVideoActions.ts';

test('heart adds love, removes love, and replaces an existing reaction', () => {
  const plain = { likedByMe: false, myReaction: null, likeCount: 4, reactionsCount: { love: 2 } };
  assert.deepEqual(nextLoveReaction(plain), {
    likedByMe: true,
    myReaction: 'love',
    likeCount: 5,
    reactionsCount: { love: 3 },
  });

  const loved = { ...plain, likedByMe: true, myReaction: 'love', likeCount: 5 };
  assert.deepEqual(nextLoveReaction(loved), {
    likedByMe: false,
    myReaction: null,
    likeCount: 4,
    reactionsCount: { love: 1 },
  });

  const liked = { ...plain, likedByMe: true, myReaction: 'like', reactionsCount: { like: 2, love: 2 } };
  assert.deepEqual(nextLoveReaction(liked), {
    likedByMe: true,
    myReaction: 'love',
    likeCount: 4,
    reactionsCount: { like: 1, love: 3 },
  });

  assert.equal(nextLoveReaction({ ...plain, myReaction: 'love' }).likeCount, 5);
});

test('social share links encode the public video URL', () => {
  const videoUrl = 'https://res.cloudinary.com/demo/video/upload/v1/a b.mp4?x=1&y=2';
  const links = videoShareLinks(videoUrl);
  assert.equal(new URL(links.facebook).searchParams.get('u'), videoUrl);
  assert.equal(new URL(links.x).searchParams.get('url'), videoUrl);
  assert.equal(new URL(links.whatsapp).searchParams.get('text'), videoUrl);
  assert.equal(new URL(links.telegram).searchParams.get('url'), videoUrl);
});

test('external links never expose private or sensitive videos', () => {
  const videoUrl = 'https://res.cloudinary.com/demo/video/upload/sample.mp4';
  assert.equal(externalShareableVideoUrl({ privacy: 'public', isSensitive: false }, videoUrl), videoUrl);
  assert.equal(externalShareableVideoUrl({ privacy: 'friends', isSensitive: false }, videoUrl), null);
  assert.equal(externalShareableVideoUrl({ privacy: 'only_me', isSensitive: false }, videoUrl), null);
  assert.equal(externalShareableVideoUrl({ privacy: 'public', isSensitive: true }, videoUrl), null);
});
