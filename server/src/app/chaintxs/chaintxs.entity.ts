import { Column, CreateDateColumn, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import { Transactions } from '../transactions/transactions.entity';

// usdt event log

// In
// address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
// args: Proxy(Result) {0: '0xF6096E69f22a9482919E09A8943E3205179e4Be0', 1: '0x7E0C0886eAF77B4ebE8f0491eE3FDC01673F87Ed', 2: 111000000n, #names: Array(0)}
// blockHash: "0x611177eb4483dd6c8620bad03519b23a75266db32131142a04ac2df8160307d2"
// blockNumber: 68877971
// data: "0x00000000000000000000000000000000000000000000000000000000069db9c0"
// fragment: EventFragment {type: 'event', inputs: Array(3), name: 'Transfer', anonymous: false, Symbol(_ethers_internal): '_EventInternal'}
// index: 199
// interface: Interface {fragments: Array(2), #errors: Map(0), #events: Map(1), #functions: Map(1), #abiCoder: AbiCoder, …}
// provider: JsonRpcProvider {#subs: Map(0), #plugins: Map(0), #pausedState: null, #destroyed: false, #networkPromise: Promise, …}
// removed: false
// topics: (3) ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x000000000000000000000000f6096e69f22a9482919e09a8943e3205179e4be0', '0x0000000000000000000000007e0c0886eaf77b4ebe8f0491ee3fdc01673f87ed']
// transactionHash: "0x690236b7af3f9337b20f80496761b4fba6825051abd2f4d5a6b22ca3ac1e5fe5"
// transactionIndex: 57
// eventName: (...)
// eventSignature: (...)
// [[Prototype]]: Log

// Out
// address: "0xc2132D05D31c914a87C6611C10748AEb04B58e8F"
// args: Proxy(Result) {0: '0x7E0C0886eAF77B4ebE8f0491eE3FDC01673F87Ed', 1: '0x1AbAAe7DA813e94988621d21aE38db31A6f06521', 2: 203000000n, #names: Array(0)}
// blockHash: "0x813d030d63cc342e46982061d606968a6eb510355fb74f3ae4114ac457ca80e4"
// blockNumber: 68957285
// data: "0x000000000000000000000000000000000000000000000000000000000c1988c0"
// fragment: EventFragment {type: 'event', inputs: Array(3), name: 'Transfer', anonymous: false, Symbol(_ethers_internal): '_EventInternal'}
// index: 154
// interface: Interface {fragments: Array(2), #errors: Map(0), #events: Map(1), #functions: Map(1), #abiCoder: AbiCoder, …}
// provider: JsonRpcProvider {#subs: Map(0), #plugins: Map(0), #pausedState: null, #destroyed: false, #networkPromise: Promise, …}
// removed: false
// topics: (3) ['0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef', '0x0000000000000000000000007e0c0886eaf77b4ebe8f0491ee3fdc01673f87ed', '0x0000000000000000000000001abaae7da813e94988621d21ae38db31a6f06521']
// transactionHash: "0xf8e80a7fe6af8e711790a6868216bca003fcbb7af25375d419c3fda42d2eae1d"
// transactionIndex: 27
// eventName: (...)
// eventSignature: (...)
// [[Prototype]]: Log

// Pol transactions

// accessList: null
// authorizationList: null
// blobVersionedHashes: null
// blockHash: "0x0f982c45562cabacd986942b22a9746220fc6f651627080ea40406e207c59fb2"
// blockNumber: 68337002
// chainId: 137n
// data: "0x"
// from: "0x02f565B24F357770611dF9d0CB37594320A7C1d7"
// gasLimit: 21000n
// gasPrice: 197722500219n
// hash: "0x1ff6edb70eadab3db2fcebbc5526e3c5b8a7014e3a9b2dafae0766aeecb1f58b"
// index: 8
// maxFeePerBlobGas: null
// maxFeePerGas: null
// maxPriorityFeePerGas: null
// nonce: 9
// provider: JsonRpcProvider {#subs: Map(0), #plugins: Map(0), #pausedState: null, #destroyed: false, #networkPromise: Promise, …}
// signature: Signature {#r: '0x143f4d76f4973f6fe1dd149e3720df2c328dc03e31f253182ca5da3c66761be8', #s: '0x27fdfd07ee223d8378b30c85704371dc41189e6b75cbb9170ac8930641942281', #v: 28, #networkV: 310n}
// to: "0x7E0C0886eAF77B4ebE8f0491eE3FDC01673F87Ed"
// type: 0
// value: 4250713255768233789n
// #startBlock: -1
// [[Prototype]]: Object

export interface Tx {
  blockHash: string;
  blockNumber: string;
  data: string;
  fromAddress: string;
  toAddress: string;
  value: string;
  transactionHash: string;
  transactionIndex: string;
}

@Entity('chaintxs')
export class ChainTxs {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  blockHash: string;

  @Column()
  blockNumber: string;

  @Column()
  data: string;

  @Column()
  fromAddress: string;

  @Column()
  toAddress: string;

  @Column()
  value: string;

  @Column()
  transactionIndex: string;

  @Column()
  transactionHash: string;

  @OneToOne(() => Transactions, transaction => transaction.chainTx)
  @JoinColumn({name: "transaction_id"})
  transaction: Transactions

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
