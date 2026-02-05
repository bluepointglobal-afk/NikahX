# Match Engine Usage Guide

This document provides examples of how to call the Match Engine RPCs from the frontend using the Supabase JS client.

## 1. Get Visible Profile
Use this to fetch a user's profile while respecting privacy settings (e.g., when viewing a card in the discovery feed).

```typescript
const { data, error } = await supabase
  .rpc('get_visible_profile', { 
    target_user_id: 'UUID_OF_TARGET_USER' 
  });

if (error) console.error(error);
// data returns:
// {
//   id: "...",
//   username: "User123",
//   age: 25,
//   city: "Dubai",
//   ...
// }
// Returns null if profile is private or hidden.
```

## 2. Check Compatibility Score
Use this to display a compatibility badge or score on a profile card.

```typescript
const { data, error } = await supabase
  .rpc('compatibility_score', { 
    user_a: 'CURRENT_USER_ID',
    user_b: 'TARGET_USER_ID' 
  });

// data returns:
// {
//   score: 85,
//   reasons: ["Good Age Match", "Same City"],
//   method: "v1_basic"
// }
```

## 3. Like / Match Action
Call this when the current user swipes right or clicks "Like".

```typescript
const { data, error } = await supabase
  .rpc('create_match_if_mutual', { 
    target_user_id: 'TARGET_USER_ID' 
  });

if (error) {
    // Handle error (e.g., self-like attempt)
}

if (data.match_created) {
    // Show "It's a Match!" modal
    // data.match_id is available here
    console.log("Match ID:", data.match_id);
} else {
    // Just a like sent, continue swipe flow
    console.log("Like sent");
}
```
