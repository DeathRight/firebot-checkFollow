# checkFollow by BigPimpinvoidkin (DeathRight)

### What it do
Asynchronously collects the complete follower list of `username` every `interval` seconds, which can be checked against using the `$checkFollow[viewer's username]` variable which returns true or false depending on if `viewer's username` follows `username` (streamer).

This also has the added benefit of being able to more silently check whether someone is following rather than create needless API calls.

- It is recommended to set interval to at least 30s (default 60s) and it will not allow <10s to keep from needlessly spamming API calls.

- NOTE: It's not recommended nor is it advised to use this to draw attention to those who unfollow you... that'd be mean. There's a reason that's not an event in the first place. This is mainly to be used to update roles/give followers rewards, not to harass those who unfollow.