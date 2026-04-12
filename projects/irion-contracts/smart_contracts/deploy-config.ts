import { AlgorandClient, microAlgo, algo } from '@algorandfoundation/algokit-utils'
import algosdk from 'algosdk'

import { LendingPoolFactory } from './artifacts/lending_pool/LendingPoolClient'
import { CreditScoreFactory } from './artifacts/credit_score/CreditScoreClient'
import { BNPLCreditFactory } from './artifacts/bnpl_credit/BNPLCreditClient'
import { MerchantEscrowFactory } from './artifacts/merchant_escrow/MerchantEscrowClient'

function getAppAddress(appId: number): string {
  return algosdk.getApplicationAddress(appId).toString()
}

console.log('Script loaded, starting deployment...')

export async function deploy() {
  console.log('=== BNPL Protocol Deployment ===')

  const algorand = AlgorandClient.fromEnvironment()
  const dispenser = await algorand.account.localNetDispenser()
  const creator = dispenser.addr.toString()
  console.log('Deployer:', creator)

  // Pre-fund all potential app addresses (1024-1500 range to be safe)
  console.log('\n[Pre-funding] Funding potential app addresses...')
  const startAppId = 1024
  const endAppId = 1500
  for (let appId = startAppId; appId <= endAppId; appId++) {
    const addr = getAppAddress(appId)
    console.log(`  Funding app ${appId}: ${addr}`)
    await algorand.send.payment({
      sender: dispenser.addr,
      receiver: addr,
      amount: algo(3),
    })
  }
  console.log('  Done funding app addresses')

  // Deploy CreditScore with bootstrap
  console.log('\n[1/5] Deploying CreditScore with bootstrap...')
  const creditScoreFactory = algorand.client.getTypedAppFactory(CreditScoreFactory, {
    defaultSender: dispenser.addr,
  })

  const { appClient: creditScoreClient } = await creditScoreFactory.deploy({
    createParams: {
      method: 'bootstrap()void',
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
    extraFee: microAlgo(1000),
  })
  console.log('CreditScore App ID:', creditScoreClient.appId)

  // Deploy LendingPool with bootstrap
  console.log('\n[2/5] Deploying LendingPool with bootstrap...')
  const lendingPoolFactory = algorand.client.getTypedAppFactory(LendingPoolFactory, {
    defaultSender: dispenser.addr,
  })

  const { appClient: lendingPoolClient } = await lendingPoolFactory.deploy({
    createParams: {
      method: 'bootstrap(uint64)void',
      args: [1n],
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
    extraFee: microAlgo(3000),
  })
  console.log('LendingPool App ID:', lendingPoolClient.appId)

  // Link contracts
  console.log('\n[3/5] Linking CreditScore and LendingPool...')
  
  const creditScoreClientForCall = creditScoreFactory.getAppClientFromGlobalState({})
  const lendingPoolClientForCall = lendingPoolFactory.getAppClientFromGlobalState({})

  await lendingPoolClientForCall.send.set_credit_score_app({
    args: { app_id: creditScoreClient.appId },
  })
  
  await creditScoreClientForCall.send.set_lending_pool_app({
    args: { app_id: lendingPoolClient.appId },
  })
  console.log('Contracts linked!')

  // Deploy BNPLCredit with bootstrap
  console.log('\n[4/5] Deploying BNPLCredit with bootstrap...')
  const bnplCreditFactory = algorand.client.getTypedAppFactory(BNPLCreditFactory, {
    defaultSender: dispenser.addr,
  })

  const { appClient: bnplCreditClient } = await bnplCreditFactory.deploy({
    createParams: {
      method: 'bootstrap(uint64,uint64)void',
      args: [creditScoreClient.appId, lendingPoolClient.appId],
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
    extraFee: microAlgo(1000),
  })
  console.log('BNPLCredit App ID:', bnplCreditClient.appId)

  // Deploy MerchantEscrow with bootstrap
  console.log('\n[5/5] Deploying MerchantEscrow with bootstrap...')
  const merchantEscrowFactory = algorand.client.getTypedAppFactory(MerchantEscrowFactory, {
    defaultSender: dispenser.addr,
  })

  const { appClient: merchantEscrowClient } = await merchantEscrowFactory.deploy({
    createParams: {
      method: 'bootstrap(uint64,uint64)void',
      args: [bnplCreditClient.appId, 1n],
    },
    onUpdate: 'append',
    onSchemaBreak: 'append',
    extraFee: microAlgo(1000),
  })
  console.log('MerchantEscrow App ID:', merchantEscrowClient.appId)

  console.log('\n=== Deployment Complete ===')
  console.log('CreditScore:', creditScoreClient.appId)
  console.log('LendingPool:', lendingPoolClient.appId)
  console.log('BNPLCredit:', bnplCreditClient.appId)
  console.log('MerchantEscrow:', merchantEscrowClient.appId)
}