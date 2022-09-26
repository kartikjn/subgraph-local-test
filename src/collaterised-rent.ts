import { BigInt, store } from "@graphprotocol/graph-ts"
import {
  CollaterisedRent,
  CollateralClaimed,
  LendingStopped,
  Lent,
  Rented,
  Returned,
  Returned__Params
} from "../generated/CollaterisedRent/CollaterisedRent"
import { Lending, Renting, Nft, User, LendingRentingCount } from "../generated/schema";
import { fetchUser, fetchNft, getNftId } from "./helpers";

let lrc = new LendingRentingCount("lendingRentingCount");
lrc.lending = BigInt.fromI32(0);
lrc.renting = BigInt.fromI32(0);
lrc.save();

// on collateral claim we must remove the lending and renting from LendingRenting
// we must also remove this from the corresponding users' profiles
// renting
export function handleClaimCollateral(event: CollateralClaimed): void {
  let claimParams = event.params;
  let lending = Lending.load(claimParams.lendingId.toString());

  if (lending != null) {
    let nftId = getNftId(claimParams.lendingId);
    let nft = Nft.load(nftId);

    lending.collateralClaimed = true;

    lrc.renting = lrc.renting.minus(BigInt.fromI32(1));
    lrc.lending = lrc.lending.plus(BigInt.fromI32(1));

    lending.save();
    if (nft != null) {
      nft.save();
    }
    lrc.save();
  }
}

// when someone stops lending, we must remove the entity from the user's
// lending field
export function handleLendingStopped(event: LendingStopped): void {
  let lendingStopParams = event.params;
  let lending = Lending.load(lendingStopParams.lendingId.toString());

  if (lending != null) {
    lrc.lending = lrc.lending.plus(BigInt.fromI32(1));

    store.remove('Lending', lending.id);
    // it is incorrect to call save after store remove operation. the below will not work
    // lending.save();
    lrc.save();
  }
}

export function handleLent(event: Lent): void {
  let lentParams = event.params;
  // imagine the following: contract A & contract B
  // contract A is the owner of the NFT
  // they lend it out. They don't see it in their Lend tab
  // contract B borrows. Now they can lend it out
  // they lend it out, and now contrct A can see it and rent it out
  // if contract A defaults, they will pay the collateral
  // this will trigger contract B default, which means contract
  // A can now claim the collateral
  // For this reason the NFT id must have additional information
  // this means that the same actual NFT may have more than one
  // entry in the graph. Number of entries is determined by how
  // many times it was lent out. The so-called NFT "hot-potato"
  // AKA mortgage backed security

  let lending = new Lending(lentParams.lendingId.toString());

  lending.nftAddress = lentParams.nftAddress;
  lending.tokenId = lentParams.tokenId;
  lending.lenderAddress = lentParams.lenderAddress;
  lending.maxRentDuration = BigInt.fromI32(lentParams.maxRentDuration);
  lending.dailyRentPrice = lentParams.dailyRentPrice;
  lending.nftPrice = lentParams.nftPrice;
  lending.paymentToken = BigInt.fromI32(lentParams.paymentToken);
  lending.collateralClaimed = false;
  lending.lentAmount = BigInt.fromI32(lentParams.lentAmount);
  lending.isERC721 = lentParams.isERC721;
  lending.lentAt = event.block.timestamp;

  let lender = fetchUser(lentParams.lenderAddress);
  lending.lenderUser = lender.id;

  let nftId = getNftId(lentParams.lendingId);
  let nft = fetchNft(nftId);
  lending.nft = nft.id;

  lrc.lending = lrc.lending.plus(BigInt.fromI32(1));

  lending.save();
  lender.save();
  nft.save();
  lrc.save();
}

export function handleRented(event: Rented): void {
  let rentedParams = event.params;
  let lendingId = rentedParams.lendingId.toString();

  let renting = new Renting(lendingId);
  renting.renterAddress = rentedParams.renterAddress;
  renting.rentDuration = BigInt.fromI32(rentedParams.rentDuration);
  renting.rentedAt = rentedParams.rentedAt;
  renting.lending = lendingId;

  let renter = fetchUser(rentedParams.renterAddress);
  renting.renterUser = renter.id;

  let lending = Lending.load(lendingId);
  if(lending != null) {
    lending.renting = renting.id;
    let nftId = getNftId(rentedParams.lendingId);
    // we know nft exists here, no need to fetch
    let nft = Nft.load(nftId);
    if(nft === null) return;
    renting.nft = nft.id;

    lrc.renting = lrc.renting.plus(BigInt.fromI32(1));

    lending.save();
    renting.save();
    renter.save();
    nft.save();
    lrc.save();
  }
}

// on returned, we remove renting from Nft
// we remove from User
// and we null out the renting field in Lending
export function handleReturned(event: Returned): void {
  let returnParams = event.params;
  let lending = Lending.load(returnParams.lendingId.toString());
  
  if(lending === null) return; 
  let renting = lending.renting;
  if(renting === null) return;
  let Renter = Renting.load(renting);
  if(Renter === null) return;
  let renter = User.load(Renter.renterAddress.toHexString());
  if(renter === null) return;
  store.remove("Renting", renting);

  let nftId = getNftId(returnParams.lendingId);
  let nft = Nft.load(nftId);
  if(nft === null) return;
  lending.renting = null;

  lrc.renting = lrc.renting.minus(BigInt.fromI32(1));

  renter.save();
  lending.save();
  nft.save();
  lrc.save();
}