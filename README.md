# checkFollow by BigPimpinVoidkin (DeathRight)

### What it do
Asynchronously collects the complete (Twitch) follower list of a `user` (streamer by default) every `interval` seconds (60 by default). Adds `$checkFollow[follower username]` variable, adds `$unfollowList` variable, adds `unfollow` event.

### Collection
It runs twice at startup to build lists to compare against. Tested with an average speed of ~630 users collected every second (~6 API calls), which as far as I know is limited only by Twitch's server response. This should be sufficiently discrete for most streamers.

It will not attempt to get a new list until the previous list is completely fetched.

### Unfollow Event
After each collection the current and previous follow lists are compared and if users have unfollowed then an `unfollow` event is triggered with the array of usernames under the variable `$unfollowList`.
**NOTE: _Please do not use this for harrassment purposes._**

### checkFollow
The `$checkFollow[follower username]` variable is added to check if someone is following `user` (defined in the script options). Theoretically, this can be _**much** less expensive_ than using Firebot's "Follow Check" conditional. It's also just useful to have a variable that can check this.

All new followers are automatically checked against even before the next list is collected.

### But why?
The primary purpose of this is so you can reward followers with roles and the like, and as such, you'd need to be able to tell if someone unfollowed. Natively, you can loop a "Follow Check" conditional, but this would result in an API call per user per interval. So... I made this. It ended up being a lot more work than I expected, but it was a good learning experience nevertheless.

### Use cases
Say you want to give every follower a role which gives them currency every so often and more permissions than a non-follower:
1. You'd run a loop at startup that iterates `$checkFollow` against Firebot's ViewerDB (`$usernameArray`) that makes sure all followers have that role and non-followers don't.
2. Listen to Firebot's native `follow` event to add the role to new followers.
3. Listen to the `unfollow` event, loop through the `$unfollowList` to remove the role.

I believe that the best thing for a streamer is to build a community, and encouraging and rewarding followers - who get notifications and thus are more likely to catch your streams - along with things like watch time all come together to create an experience that fosters said community.

### Final notes/Disclaimers

- The default interval is 60 seconds and anything less than 30s is not allowed to keep from needlessly spamming API calls
- This does not check for unfollows that occured while Firebot was closed. See "Use cases."
- **DISCLAIMER:** Again, please do not use my work to harass people.
