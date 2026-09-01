# Two-wallet Sepolia runbook

This is the shortest honest path to the final bounty evidence. Use two separate
MetaMask accounts, not two tabs connected to the same account.

## Prepare

1. Give Wallet A and Wallet B enough Sepolia ETH for roughly ten transactions
   each. The in-app faucet supplies mock USDT, not gas.
2. Open <https://veil-pool.vercel.app/pool> in two browser profiles or one normal
   and one private window.
3. Connect each profile to its own wallet and confirm the header says
   `Sepolia · Live`.
4. Start a text file containing one row per action. Paste each transaction hash
   immediately after confirmation.

## Enter both wallets

Complete these steps independently in each profile:

1. Mint mock USDT.
2. Approve the confidential wrapper.
3. Shield USDT into cUSDT. Record that this public wrap amount is visible.
4. Authorise the pool for one day.
5. Deposit a small amount privately. Different amounts make the weighted example
   easier to explain, but never publish those amounts as on-chain data.
6. Sign the reveal request and confirm each profile sees only its own balance.

## Prime eligibility

A wallet first becomes eligible in the draw *after* the draw in which it
registers. This protects a draw from changing weights while it is ready.

1. When the current draw is ready, seal it once. This activates newly registered
   wallets for the following draw; it is not the draw to feature in the video.
2. Wait for the deployed ten-minute interval.
3. Refresh both profiles and confirm both wallets report eligibility for the new
   draw. The participant count is public; the amounts are not.

## Record the proof draw

1. Start the real-person recording with the next draw already at `00:00`.
2. Trigger the draw from either wallet and keep the transaction state visible
   until confirmation.
3. Capture the settled draw room. It must not highlight or name a winner.
4. In each profile, sign a reveal request. Exactly one wallet should show the
   25 cUSDT winnings delta.
5. Claim from the winner and save the transaction hash.
6. Withdraw the full principal from both wallets and save both hashes.
7. Capture final balances and the browser console with no uncaught errors.

## Stop conditions

Do not record the final video if either wallet is missing, the participant count
is one, a wallet is not yet eligible, the live card reports unavailable Sepolia
data, or the draw is not ready. Fix the state first; editing around a failed
transaction is weaker evidence than showing the wait honestly.
