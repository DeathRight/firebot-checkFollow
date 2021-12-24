# checkFollow by BigPimpinVoidkin (DeathRight)

### What it do
Asynchronously collects the complete follower list of `username` every `interval` seconds, which can be checked against using the `$checkFollow[viewer's username]` variable which returns true or false depending on if `viewer's username` follows `username` (streamer). Also adds `unfollow` event which is triggered with a list of latest unfollows every `interval` seconds.

This also has the added benefit of being able to more silently check whether someone is following rather than create needless API calls.

- It is recommended to set interval to at least 30s (default 60s) and it will not allow <10s to keep from needlessly spamming API calls.
- NOTE: This does not check for unfollows that occured while Firebot was closed. For that, you should manually iterate `$checkFollow` against a list of users upon Firebot startup (i.e. every person with a role). This is still less expensive than using the native Firebot follow check, as that is an API call per use.
- DISCLAIMER: It's not recommended nor is it (imo) moral to use this to draw attention to those who unfollow you... that'd be mean. There's a reason that's not an event in the first place. This is mainly to be used to update roles/give followers rewards, not to harass those who unfollow.
