# Liquidity Mining Rewards Script 
* Monitors ERC-20 holdings over block periods
* Rewards are divided according to your weight of holdings 
* Holding over longer periods increases your weight by a time multiplier 

## DISCLAIMER 
Liquidity Pools carry a fair amount of risk. We do not advise that you contribute 
liquidity unless you are familiar with them. As always, smart contracts may contain 
unknown exploits which could put all funds contained within at risk. If these funds 
are taken then no one can get them back.  

Another really important risk involving liquidity pools is [impermanent loss.](https://blog.bancor.network/beginners-guide-to-getting-rekt-by-impermanent-loss-7c9510cb2f22)  



## Pool Tokens (ERC-20 compatible)
When liquidity is added to a pool on Ethereum, ERC-20 tokens are minted and transferred
to your address as a stake in the pool.  
  
This script uses holdings of these ERC-20 pool tokens to monitor stake over time
and time multipliers.  

## Script Constraints 
* A minimum amount of liquidity is enforced. Currently the script ensures at least 
   2 pool tokens are held to be eligible. (~0.25 ETH in value)  
  
Calculate rewards distributions based off of ERC-20 holdings over various block periods.  

## Get Started 
`npm install`   
`npm run start`  


