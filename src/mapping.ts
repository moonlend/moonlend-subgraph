import {
  OwnershipTransferred,
  PoolCreated
} from "../generated/MoonLendFactory/MoonLendFactory"
import {
  LoanCreated,
  Transfer,
  MoonLend as MoonLendToCall,
  LiquidatorAdded,
  LiquidatorRemoved,
  ChangeLTVCall,
  ChangeInterestCall
} from "../generated/templates/MoonLend/MoonLend"
import { Pool, Factory, Loan, Liquidator } from "../generated/schema"
import {MoonLend} from "../generated/templates"
import { store } from '@graphprotocol/graph-ts'

export function handlePoolCreated(event: PoolCreated): void {
  const factoryAddress = event.address;
  const nftContract = event.params.nftContract;
  const poolAddress = event.params.pool;
  const block = event.block.number;
  const timestamp = event.block.timestamp;

  // Load Factory
  let factory = Factory.load(factoryAddress.toHexString());

  // Create new Factory entity with info if null
  if (factory === null) {
    factory = new Factory(factoryAddress.toHexString());
    factory.address = factoryAddress;
    factory.createdTimestamp = timestamp;
    factory.createdBlock = block;
  }

  // Create new contract entity and fill with info
  let contract = new Pool(poolAddress.toHexString());
  contract.address = poolAddress;
  contract.factory = factory.id;
  contract.nftContract = nftContract;
  contract.owner = event.params.owner;
  contract.createdTimestamp = timestamp;
  contract.createdBlock = block;

  let contractToCall = MoonLendToCall.bind(poolAddress)
  contract.maxLoanLength = contractToCall.maxLoanLength();
  contract.name = contractToCall.name();
  contract.symbol = contractToCall.symbol();
  contract.ltv = contractToCall.ltv();
  contract.minimumInterest = contractToCall.minimumInterest();
  contract.maxVariableInterestPerEthPerSecond = contractToCall.maxVariableInterestPerEthPerSecond();

  // Start tracking the moonpay contract
  MoonLend.create(poolAddress);

  //Savooooor
  factory.save();
  contract.save();
}

export function handleOwnershipTransferred(event: OwnershipTransferred): void {
  let pool = Pool.load(event.address.toHexString());
  if(pool !== null){
    pool.owner = event.params.newOwner;
    pool.save();
  }
}

export function handleChangeLTV(call: ChangeLTVCall): void {
  let pool = Pool.load(call.to.toHexString());
  if(pool !== null){
    pool.ltv = call.inputs._ltv;
    pool.save();
  }
}

export function handleChangeInterest(call: ChangeInterestCall): void {
  let pool = Pool.load(call.to.toHexString());
  if(pool !== null){
    pool.minimumInterest = call.inputs._minimumInterest;
    pool.maxVariableInterestPerEthPerSecond = call.inputs._maxInterestPerEthPerSecond;
    pool.save();
  }
}

export function handleTransfer(event: Transfer): void {
  let loanId = event.params.tokenId;
  const newOwner = event.params.to;

  const loan = Loan.load(loanId.toHexString());

  if(loan!.owner === null){
    loan!.originalOwner = newOwner;
  }
  loan!.owner = newOwner;
  // Save and return
  loan!.save();
}

export function handleLoanCreated(event: LoanCreated): void {
  const poolAddress = event.address;
  const loanId = event.params.loanId;
  const nft = event.params.nft;
  const interest = event.params.interest;
  const startTime = event.params.startTime;
  const borrowed = event.params.borrowed;
  const block = event.block.number;
  let pool = Pool.load(poolAddress.toHexString());

  let loan = new Loan(loanId.toHexString());
  loan.loanId = loanId;
  loan.nftId = nft;
  loan.interest = interest;
  loan.borrowed = borrowed;
  loan.startTime = startTime;
  loan.createdBlock = block;
  loan.deadline = startTime.plus(pool!.maxLoanLength);
  loan.tokenUri = `https://nft.moonlend.app/nft/1287/${pool!.address.toHexString().toLowerCase()}/${pool!.nftContract.toHexString().toLowerCase()}/${loanId.toString()}`;
  loan.pool = pool!.id;

  loan.save();
}

export function handleLiquidatorAdded(event: LiquidatorAdded): void {
  let pool = event.address.toHexString()
  let liqAddress = event.params.liquidator
  let id = `${pool}-${liqAddress.toHexString()}`
  let liquidator = Liquidator.load(id)
  if(liquidator === null){
    liquidator = new Liquidator(id);
    liquidator.address = liqAddress
    liquidator.pool = Pool.load(pool)!.id;
    liquidator.save();
  }
}

export function handleLiquidatorRemoved(event: LiquidatorRemoved): void {
  let pool = event.address.toHexString()
  let id = `${pool}-${event.params.liquidator.toHexString()}`
  let liquidator = Liquidator.load(id)
  if(liquidator !== null){
    store.remove('Liquidator', id)
  }
}
