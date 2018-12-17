pragma solidity ^0.4.24;
import './TwoKeyContract.sol';

contract TwoKeySignedContract is TwoKeyContract {
  // the 2key link generated by the owner of this contract contains a secret which is a private key,
  // this is the public part of this secret
  mapping(address => address) private public_link_key;

  function setPublicLinkKeyOf(address me, address new_public_key) private {
    me = plasmaOf(me);
    require(balanceOf(me) > 0,'no ARCs');
    address old_address = public_link_key[me];
    if (old_address == address(0)) {
      public_link_key[me] = new_public_key;
    } else {
      require(old_address == new_public_key,'public key can not be modified');
    }
    public_link_key[me] = new_public_key;
  }

  function setPublicLinkKey(address new_public_key) public {
    setPublicLinkKeyOf(msg.sender, new_public_key);
  }

  function publicLinkKeyOf(address me) public view returns (address) {
    return public_link_key[plasmaOf(me)];
  }


  function transferSig(bytes sig) public returns (address[]) {
    // move ARCs and set public_link keys and weights/cuts based on signature information
    // returns the last address in the sig

    // sig structure:
    // 1 byte version 0 or 1
    // 20 bytes are the address of the contractor or the influencer who created sig.
    //  this is the "anchor" of the link
    //  It must have a public key aleady stored for it in public_link_key
    // Begining of a loop on steps in the link:
    // * 65 bytes are step-signature using the secret from previous step
    // * message of the step that is going to be hashed and used to compute the above step-signature.
    //   message length depend on version 41 (version 0) or 86 (version 1):
    //   * 1 byte cut (percentage) each influencer takes from the bounty. the cut is stored in influencer2cut or weight for voting
    //   * 20 bytes address of influencer (version 0) or 65 bytes of signature of cut using the influencer address to sign
    //   * 20 bytes public key of the last secret
    // In the last step the message can be optional. If it is missing the message used is the address of the sender
    address old_address;
    assembly
    {
      old_address := mload(add(sig, 21))
    }
    old_address = plasmaOf(old_address);
    address old_key = public_link_key[old_address];

    address[] memory influencers;
    address[] memory keys;
    uint8[] memory weights;
    (influencers, keys, weights) = Call.recoverSig(sig, old_key, plasmaOf(msg.sender));

    // check if we exactly reached the end of the signature. this can only happen if the signature
    // was generated with free_join_take and in this case the last part of the signature must have been
    // generated by the caller of this method
    require(// influencers[influencers.length-1] == msg.sender ||
            influencers[influencers.length-1] == senderPlasma() ||
            owner == msg.sender,'only the contractor or the last in the link can call transferSig');

    uint i;
    address new_address;
    // move ARCs based on signature information
    for (i = 0; i < influencers.length; i++) {
      new_address = plasmaOf(influencers[i]);

      if (received_from[new_address] == 0) {
        transferFromInternal(old_address, new_address, 1);
      } else {
        require(received_from[new_address] == old_address,'only tree ARCs allowed');
      }
      old_address = new_address;

      // TODO Updating the public key of influencers may not be a good idea because it will require the influencers to use
      // a deterministic private/public key in the link and this might require user interaction (MetaMask signature)
      // TODO a possible solution is change public_link_key to address=>address[]
      // update (only once) the public address used by each influencer
      // we will need this in case one of the influencers will want to start his own off-chain link
      if (i < keys.length) {
        setPublicLinkKeyOf(new_address, keys[i]);
      }

      // update (only once) the cut used by each influencer
      // we will need this in case one of the influencers will want to start his own off-chain link
      if (i < weights.length) {
        setCutOf(new_address, uint256(weights[i]));
      }
    }

    return influencers;
  }

  function buySign(bytes sig) public payable {
    // validate sig AND populate received_from and influencer2cut
    transferSig(sig);

    buyProduct();
  }
}

contract TwoKeySignedAcquisitionContract is TwoKeyAcquisitionContract, TwoKeySignedContract {
  constructor(TwoKeyReg _reg, TwoKeyEventSource _eventSource, string _name, string _symbol,
        uint256 _tSupply, uint256 _quota, uint256 _cost, uint256 _bounty,
        uint256 _units, string _ipfs_hash)
        public
        TwoKeyAcquisitionContract(_reg,_eventSource,_name,_symbol,_tSupply,_quota,_cost,_bounty,_units,_ipfs_hash)
  {
  }
}

contract TwoKeySignedPresellContract is TwoKeyPresellContract, TwoKeySignedContract {
  constructor(TwoKeyReg _reg, TwoKeyEventSource _eventSource, string _name, string _symbol,
        uint256 _tSupply, uint256 _quota, uint256 _cost, uint256 _bounty,
        string _ipfs_hash, ERC20full _erc20_token_sell_contract)
        public
        TwoKeyPresellContract(_reg, _eventSource,_name,_symbol,_tSupply,_quota,_cost,_bounty,_ipfs_hash,_erc20_token_sell_contract)
  {
  }
}
