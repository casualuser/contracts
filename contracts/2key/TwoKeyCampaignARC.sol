pragma solidity ^0.4.24;

import '../openzeppelin-solidity/contracts/math/SafeMath.sol';
import './TwoKeyEventSource.sol';
import "./ArcERC20.sol";

contract TwoKeyCampaignARC is ArcERC20 {

	using SafeMath for uint256;

	address public contractor;
    address public moderator;
	address ownerPlasma;

	uint256 totalSupply_ = 1000000;

	TwoKeyEventSource twoKeyEventSource;

	uint256 conversionQuota;  // maximal ARC tokens that can be passed in transferFrom

	// referral graph, who did you receive the referral from
	mapping(address => address) public received_from;

    // @notice Modifier which allows only contractor to call methods
    modifier onlyContractor() {
        require(msg.sender == contractor);
        _;
    }


    constructor(address _twoKeyEventSource, uint256 _conversionQuota) ArcERC20() public {
		require(_twoKeyEventSource != address(0));
		twoKeyEventSource = TwoKeyEventSource(_twoKeyEventSource);
		ownerPlasma = twoKeyEventSource.plasmaOf(msg.sender);
		received_from[ownerPlasma] = ownerPlasma;
		conversionQuota = _conversionQuota;
		balances[ownerPlasma] = totalSupply_;
	}

	/**
     * @dev Transfer tokens from one address to another
     * @param _from address The address which you want to send tokens from ALREADY converted to plasma
     * @param _to address The address which you want to transfer to ALREADY converted to plasma
     * @param _value uint256 the amount of tokens to be transferred
     */
	function transferFrom(address _from, address _to, uint256 _value) public returns (bool) {
		//Add modifier who can call this!! onlyContractorOrModerator || msg.sender == from something like this
		return transferFromInternal(_from, _to, _value);
	}

	function transferFromInternal(address _from, address _to, uint256 _value) internal returns (bool) {
		// _from and _to are assumed to be already converted to plasma address (e.g. using plasmaOf)
		require(_value == 1, 'can only transfer 1 ARC');
		require(_from != address(0), '_from undefined');
		require(_to != address(0), '_to undefined');

		//Addresses are already plasma, don't see the point of next 2 lines!
		_from = twoKeyEventSource.plasmaOf(_from);
		_to = twoKeyEventSource.plasmaOf(_to);

		require(balances[_from] > 0,'_from does not have arcs');
		balances[_from] = balances[_from].sub(1);
		balances[_to] = balances[_to].add(conversionQuota);
		totalSupply_ = totalSupply_.add(conversionQuota.sub(1));

		emit Transfer(_from, _to, 1);
		if (received_from[_to] == 0) {
			// inform the 2key admin contract, once, that an influencer has joined
			twoKeyEventSource.joined(this, _from, _to);
		}
		received_from[_to] = _from;
		return true;
	}



	/**
	 * @notice Function to get referrers for the converter
	 * @param customer is the converter ETH address
	 * @dev inside method we're converting it to plasma address
	 */
	function getReferrers(address customer) internal view returns (address[]) {
		// build a list of all influencers from converter back to to contractor
		// dont count the conveter and contractor themselves
		address influencer = twoKeyEventSource.plasmaOf(customer);
		// first count how many influencers
		uint n_influencers = 0;
		while (true) {
			influencer = twoKeyEventSource.plasmaOf(received_from[influencer]);
			// Owner is owner of campaign (contractor)
			if (influencer == ownerPlasma) {
				break;
			}
			n_influencers++;
		}
		// allocate temporary memory to hold the influencers
		address[] memory influencers = new address[](n_influencers);
		// fill the array of influencers in reverse order, from the last influencer just before the converter to the
		// first influencer just after the contractor
		influencer = twoKeyEventSource.plasmaOf(customer);
		while (n_influencers > 0) {
			influencer = twoKeyEventSource.plasmaOf(received_from[influencer]);
			n_influencers--;
			influencers[n_influencers] = influencer;
		}

		return influencers;
	}

}
