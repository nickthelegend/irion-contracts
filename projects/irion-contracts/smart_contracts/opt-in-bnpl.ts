import algosdk from 'algosdk'
import { AlgorandClient, algo, microAlgo } from '@algorandfoundation/algokit-utils'
import { BnplCreditFactory } from './artifacts/bnpl_credit/BNPLCreditClient'

const DEPLOYER_MNEMONIC = 'announce feed swing base certain rib rose phrase crouch rotate voyage enroll same sort flush emotion pulp airport notice inject pelican zero blossom about honey'
const ALGOD_SERVER = 'https://testnet-api.algonode.cloud'
const ALGOD_PORT = 443
const ALGOD_TOKEN = ''

const IUSDC_ASSET_ID = 758916950
const BNPL_CREDIT_APP_ID = 758917027

async function run() {
  console.log('Opting BNPLCredit app into iUSDC on Testnet...')
  
  const algod = new algosdk.Algodv2(ALGOD_TOKEN, ALGOD_SERVER, ALGOD_PORT)
  const deployer = algosdk.mnemonicToSecretKey(DEPLOYER_MNEMONIC)
  
  const algorand = AlgorandClient.fromClients({ algod })
  algorand.setDefaultSigner(algosdk.makeBasicAccountTransactionSigner(deployer))
  algorand.setDefaultValidityWindow(1000)
  
  const factory = algorand.client.getTypedAppFactory(BnplCreditFactory, {
    defaultSender: deployer.addr.toString()
  })
  
  const client = factory.getAppClientById({ appId: BigInt(BNPL_CREDIT_APP_ID) })
  
  console.log('Deployer address:', deployer.addr.toString())
  console.log('BNPLCredit App ID:', BNPL_CREDIT_APP_ID)
  console.log('Asset ID:', IUSDC_ASSET_ID)
  
  try {
    const result = await client.send.optInToAsset({
      args: {
        asset: BigInt(IUSDC_ASSET_ID)
      },
      extraFee: algo(0.001) // Pay for the inner asset transfer
    })
    console.log('Success! Opt-in transaction completed.')
    console.log('TX ID:', result.transaction.txID())
  } catch (err: any) {
    console.error('Failed to opt in:', err.message ?? err)
  }
}

run().catch(console.error)
