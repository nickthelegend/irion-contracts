import { AlgorandClient } from '@algorandfoundation/algokit-utils'

import { LendingPoolFactory } from './artifacts/lending_pool/LendingPoolClient'
import { CreditScoreFactory } from './artifacts/credit_score/CreditScoreClient'
import { BNPLCreditFactory } from './artifacts/bnpl_credit/BNPLCreditClient'
import { MerchantEscrowFactory } from './artifacts/merchant_escrow/MerchantEscrowClient'

console.log('Script loaded, starting deployment...')

export async function deploy() {
  console.log('=== BNPL Protocol Deployment ===')

  const algorand = AlgorandClient.fromEnvironment()
  const deployer = await algorand.account.fromEnvironment('DEPLOYER')

  console.log('Deployer:', deployer.addr)

  // Deploy CreditScore
  console.log('[1/4] Deploying CreditScore...')
  const creditScoreFactory = algorand.client.getTypedAppFactory(CreditScoreFactory, {
    defaultSender: deployer.addr,
  })
  const { appClient: creditScoreClient } = await creditScoreFactory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })
  console.log('CreditScore App ID:', creditScoreClient.appId)

  // Deploy LendingPool
  console.log('\n[2/4] Deploying LendingPool...')
  const lendingPoolFactory = algorand.client.getTypedAppFactory(LendingPoolFactory, {
    defaultSender: deployer.addr,
  })
  const { appClient: lendingPoolClient } = await lendingPoolFactory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  await lendingPoolClient.send.bootstrap({
    args: { pool_asset_id: 1n },
    coverAppCallInnerTransactionFees: true,
    maxFee: 1000n,
  })
  console.log('LendingPool App ID:', lendingPoolClient.appId)

  // Link contracts
  console.log('\n[3/4] Linking contracts...')
  await creditScoreClient.send.set_lending_pool_app({
    args: { app_id: lendingPoolClient.appId },
  })
  await lendingPoolClient.send.set_credit_score_app({
    args: { app_id: creditScoreClient.appId },
  })

  // Deploy BNPLCredit
  console.log('\n[4/4] Deploying BNPLCredit...')
  const bnplCreditFactory = algorand.client.getTypedAppFactory(BNPLCreditFactory, {
    defaultSender: deployer.addr,
  })
  const { appClient: bnplCreditClient } = await bnplCreditFactory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  await bnplCreditClient.send.bootstrap({
    args: {
      credit_score_app_id: creditScoreClient.appId,
      lending_pool_app_id: lendingPoolClient.appId,
    },
  })
  console.log('BNPLCredit App ID:', bnplCreditClient.appId)

  // Deploy MerchantEscrow
  console.log('\n[5/5] Deploying MerchantEscrow...')
  const merchantEscrowFactory = algorand.client.getTypedAppFactory(MerchantEscrowFactory, {
    defaultSender: deployer.addr,
  })
  const { appClient: merchantEscrowClient } = await merchantEscrowFactory.deploy({
    onUpdate: 'append',
    onSchemaBreak: 'append',
  })

  await merchantEscrowClient.send.bootstrap({
    args: {
      bnpl_app_id: bnplCreditClient.appId,
      usdc_asset_id: 1n,
    },
  })
  console.log('MerchantEscrow App ID:', merchantEscrowClient.appId)

  console.log('\n=== Deployment Complete ===')
  console.log('CreditScore:', creditScoreClient.appId)
  console.log('LendingPool:', lendingPoolClient.appId)
  console.log('BNPLCredit:', bnplCreditClient.appId)
  console.log('MerchantEscrow:', merchantEscrowClient.appId)
}