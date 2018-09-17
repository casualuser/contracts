/* GENERATED BY TYPECHAIN VER. 0.2.7 */
/* tslint:disable */

import { BigNumber } from "bignumber.js";
import * as TC from "./typechain-runtime";

export class IndividuallyCappedCrowdsale extends TC.TypeChainContract {
  public readonly rawWeb3Contract: any;

  public constructor(web3: any, address: string | BigNumber) {
    const abi = [
      {
        constant: true,
        inputs: [],
        name: "rate",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: true,
        inputs: [],
        name: "weiRaised",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: true,
        inputs: [{ name: "", type: "address" }],
        name: "contributions",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: true,
        inputs: [],
        name: "wallet",
        outputs: [{ name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: true,
        inputs: [{ name: "", type: "address" }],
        name: "caps",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: false,
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        constant: true,
        inputs: [],
        name: "owner",
        outputs: [{ name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: false,
        inputs: [{ name: "_beneficiary", type: "address" }],
        name: "buyTokens",
        outputs: [],
        payable: true,
        stateMutability: "payable",
        type: "function"
      },
      {
        constant: false,
        inputs: [{ name: "_newOwner", type: "address" }],
        name: "transferOwnership",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        constant: true,
        inputs: [],
        name: "token",
        outputs: [{ name: "", type: "address" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      { payable: true, stateMutability: "payable", type: "fallback" },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "purchaser", type: "address" },
          { indexed: true, name: "beneficiary", type: "address" },
          { indexed: false, name: "value", type: "uint256" },
          { indexed: false, name: "amount", type: "uint256" }
        ],
        name: "TokenPurchase",
        type: "event"
      },
      {
        anonymous: false,
        inputs: [{ indexed: true, name: "previousOwner", type: "address" }],
        name: "OwnershipRenounced",
        type: "event"
      },
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: "previousOwner", type: "address" },
          { indexed: true, name: "newOwner", type: "address" }
        ],
        name: "OwnershipTransferred",
        type: "event"
      },
      {
        constant: false,
        inputs: [
          { name: "_beneficiary", type: "address" },
          { name: "_cap", type: "uint256" }
        ],
        name: "setUserCap",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        constant: false,
        inputs: [
          { name: "_beneficiaries", type: "address[]" },
          { name: "_cap", type: "uint256" }
        ],
        name: "setGroupCap",
        outputs: [],
        payable: false,
        stateMutability: "nonpayable",
        type: "function"
      },
      {
        constant: true,
        inputs: [{ name: "_beneficiary", type: "address" }],
        name: "getUserCap",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      },
      {
        constant: true,
        inputs: [{ name: "_beneficiary", type: "address" }],
        name: "getUserContribution",
        outputs: [{ name: "", type: "uint256" }],
        payable: false,
        stateMutability: "view",
        type: "function"
      }
    ];
    super(web3, address, abi);
  }

  static async createAndValidate(
    web3: any,
    address: string | BigNumber
  ): Promise<IndividuallyCappedCrowdsale> {
    const contract = new IndividuallyCappedCrowdsale(web3, address);
    const code = await TC.promisify(web3.eth.getCode, [address]);

    // in case of missing smartcontract, code can be equal to "0x0" or "0x" depending on exact web3 implementation
    // to cover all these cases we just check against the source code length — there won't be any meaningful EVM program in less then 3 chars
    if (code.length < 4) {
      throw new Error(`Contract at ${address} doesn't exist!`);
    }
    return contract;
  }

  public get rate(): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.rate, []);
  }

  public get weiRaised(): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.weiRaised, []);
  }

  public get wallet(): Promise<string> {
    return TC.promisify(this.rawWeb3Contract.wallet, []);
  }

  public get owner(): Promise<string> {
    return TC.promisify(this.rawWeb3Contract.owner, []);
  }

  public get token(): Promise<string> {
    return TC.promisify(this.rawWeb3Contract.token, []);
  }

  public contributions(arg0: BigNumber | string): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.contributions, [arg0.toString()]);
  }

  public caps(arg0: BigNumber | string): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.caps, [arg0.toString()]);
  }

  public getUserCap(_beneficiary: BigNumber | string): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.getUserCap, [
      _beneficiary.toString()
    ]);
  }

  public getUserContribution(
    _beneficiary: BigNumber | string
  ): Promise<BigNumber> {
    return TC.promisify(this.rawWeb3Contract.getUserContribution, [
      _beneficiary.toString()
    ]);
  }

  public renounceOwnershipTx(): TC.DeferredTransactionWrapper<TC.ITxParams> {
    return new TC.DeferredTransactionWrapper<TC.ITxParams>(
      this,
      "renounceOwnership",
      []
    );
  }
  public buyTokensTx(
    _beneficiary: BigNumber | string
  ): TC.DeferredTransactionWrapper<TC.IPayableTxParams> {
    return new TC.DeferredTransactionWrapper<TC.IPayableTxParams>(
      this,
      "buyTokens",
      [_beneficiary.toString()]
    );
  }
  public transferOwnershipTx(
    _newOwner: BigNumber | string
  ): TC.DeferredTransactionWrapper<TC.ITxParams> {
    return new TC.DeferredTransactionWrapper<TC.ITxParams>(
      this,
      "transferOwnership",
      [_newOwner.toString()]
    );
  }
  public setUserCapTx(
    _beneficiary: BigNumber | string,
    _cap: BigNumber | number
  ): TC.DeferredTransactionWrapper<TC.ITxParams> {
    return new TC.DeferredTransactionWrapper<TC.ITxParams>(this, "setUserCap", [
      _beneficiary.toString(),
      _cap.toString()
    ]);
  }
  public setGroupCapTx(
    _beneficiaries: string[],
    _cap: BigNumber | number
  ): TC.DeferredTransactionWrapper<TC.ITxParams> {
    return new TC.DeferredTransactionWrapper<TC.ITxParams>(
      this,
      "setGroupCap",
      [_beneficiaries.map(val => val.toString()), _cap.toString()]
    );
  }

  public TokenPurchaseEvent(eventFilter: {
    purchaser?: BigNumber | string | Array<BigNumber | string>;
    beneficiary?: BigNumber | string | Array<BigNumber | string>;
  }): TC.DeferredEventWrapper<
    {
      purchaser: BigNumber | string;
      beneficiary: BigNumber | string;
      value: BigNumber | number;
      amount: BigNumber | number;
    },
    {
      purchaser?: BigNumber | string | Array<BigNumber | string>;
      beneficiary?: BigNumber | string | Array<BigNumber | string>;
    }
  > {
    return new TC.DeferredEventWrapper<
      {
        purchaser: BigNumber | string;
        beneficiary: BigNumber | string;
        value: BigNumber | number;
        amount: BigNumber | number;
      },
      {
        purchaser?: BigNumber | string | Array<BigNumber | string>;
        beneficiary?: BigNumber | string | Array<BigNumber | string>;
      }
    >(this, "TokenPurchase", eventFilter);
  }
  public OwnershipRenouncedEvent(eventFilter: {
    previousOwner?: BigNumber | string | Array<BigNumber | string>;
  }): TC.DeferredEventWrapper<
    { previousOwner: BigNumber | string },
    { previousOwner?: BigNumber | string | Array<BigNumber | string> }
  > {
    return new TC.DeferredEventWrapper<
      { previousOwner: BigNumber | string },
      { previousOwner?: BigNumber | string | Array<BigNumber | string> }
    >(this, "OwnershipRenounced", eventFilter);
  }
  public OwnershipTransferredEvent(eventFilter: {
    previousOwner?: BigNumber | string | Array<BigNumber | string>;
    newOwner?: BigNumber | string | Array<BigNumber | string>;
  }): TC.DeferredEventWrapper<
    { previousOwner: BigNumber | string; newOwner: BigNumber | string },
    {
      previousOwner?: BigNumber | string | Array<BigNumber | string>;
      newOwner?: BigNumber | string | Array<BigNumber | string>;
    }
  > {
    return new TC.DeferredEventWrapper<
      { previousOwner: BigNumber | string; newOwner: BigNumber | string },
      {
        previousOwner?: BigNumber | string | Array<BigNumber | string>;
        newOwner?: BigNumber | string | Array<BigNumber | string>;
      }
    >(this, "OwnershipTransferred", eventFilter);
  }
}
