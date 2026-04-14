import * as algokit from '@algorandfoundation/algokit-utils'
import { LendingPoolClient } from '../smart_contracts/artifacts/lending_pool/LendingPoolClient'
import algosdk from 'algosdk'

async function fundPool() {
  const algorand = algokit.AlgorandClient.fromEnvironment()
  const dispenser = await algorand.account.localNetDispenser()
  const usdcAssetId = 1123
  const poolAppId = 1127
  const lpTokenId = 1131

  console.log(`Dispenser: ${dispenser.addr}`)
  
  const poolClient = new LendingPoolClient({
    appId: BigInt(poolAppId),
    algorand: algorand,
    defaultSender: dispenser.addr,
  })

  // Opt-in to LP token
  try {
    await algorand.send.assetOptIn({
        sender: dispenser.addr,
        assetId: BigInt(lpTokenId),
    })
    console.log('Opted in to LP token')
  } catch (e) {
    console.log('Already opted in')
  }

  const depositAmount = 1_000_000 * 1_000_000

  // Build AXFER
  const axfer = await algorand.createTransaction.assetTransfer({
    sender: dispenser.addr,
    receiver: algosdk.getApplicationAddress(poolAppId),
    assetId: BigInt(usdcAssetId),
    amount: BigInt(depositAmount),
  })

  console.log('Depositing...')
  await poolClient.send.deposit({
    args: { payment: axfer },
    extraFee: algokit.microAlgo(1000), // Cover inner txn fee
  })

  console.log('Deposit successful!')
}

fundPool().catch(console.error)
