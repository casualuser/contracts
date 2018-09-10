pragma solidity ^0.4.24; 

import '../openzeppelin-solidity/contracts/lifecycle/Destructible.sol';
import '../openzeppelin-solidity/contracts/ownership/Ownable.sol';

import './TwoKeyEconomy.sol';
import './TwoKeyUpgradableExchange.sol';
import "../interfaces/IAdminContract.sol";
import "./TwoKeyEventSource.sol";
import "./TwoKeyReg.sol";

// SAFT are to be implemented by transferEtherByAdmins with the amount including the discount, according to the prevailing rate

contract TwoKeyAdmin is  Ownable, Destructible, AdminContract {

	TwoKeyEconomy private economy;
	address private electorateAdmins;
	TwoKeyUpgradableExchange private exchange;
	address private newTwoKeyAdminAddress;
	bool private wasReplaced; 
	TwoKeyEventSource twoKeyEventSource;
	TwoKeyReg private twoKeyReg;

	constructor(
		address _electorateAdmins,
		TwoKeyUpgradableExchange _exchange
	) Ownable() Destructible() payable public {
		require(_electorateAdmins != address(0));
		require(_exchange != address(0));
		wasReplaced = false;
		exchange = _exchange;
		electorateAdmins = _electorateAdmins;	
	}

    
    /// @notice Function where only elected admin can replace the exisitng admin contract with new admin contract. 
    /// @dev This method is expected to transfer it's current economy to new admin contract
    /// @param _newAdminContract is address of New Admin Contract
	function replaceOneself(address _newAdminContract) external wasNotReplaced adminsVotingApproved {
		uint balanceOfOldAdmin = economy.balanceOf(address(this));
		TwoKeyAdmin newAdminContractObject = TwoKeyAdmin(_newAdminContract);
		newTwoKeyAdminAddress = _newAdminContract;
		newAdminContractObject.setTwoKeyEconomy(economy);
		newAdminContractObject.setTwoKeyReg(twoKeyReg);
		wasReplaced = true;
		economy.transfer(_newAdminContract, balanceOfOldAdmin);	
		economy.adminAddRole(_newAdminContract, "admin");
		newAdminContractObject.transfer(address(this).balance);				
        newAdminContractObject.setTwoKeyEconomy(economy);
		newAdminContractObject.setTwoKeyReg(twoKeyReg);
		// newAdminContractObject.setTwoKeyExchange(exchange);
		// twoKeyEventSource.changeAdmin(_newAdminContract);
	}
	
    /// @notice Function where only elected admin can transfer tokens to an address
    /// @dev We're recuring to address different from address 0 and token amount greator than 0
    /// @param _to receiver's address
    /// @param _tokens is token amounts to be transfers
	function transferByAdmins(address _to, uint256 _tokens) external wasNotReplaced adminsVotingApproved {
		require (_to != address(0) && _tokens > 0);
		economy.transfer(_to, _tokens);
	}

    /// @notice Function where only elected admin can upgrade exchange contract address
    /// @dev We're recuring newExchange address different from address 0
    /// @param newExchange is New Upgradable Exchange contract address
	function upgradeEconomyExchangeByAdmins(address newExchange) external wasNotReplaced adminsVotingApproved {
		require (newExchange != address(0));
		exchange.upgrade(newExchange);
	}

    /// @notice Function where only elected admin can transfer ethers to an address
    /// @dev We're recuring to address different from address 0 and amount greator than 0
    /// @param to receiver's address
    /// @param amount of ethers to be transfers
	function transferEtherByAdmins(address to, uint256 amount) external wasNotReplaced adminsVotingApproved {
		require(to != address(0)  && amount > 0);
		to.transfer(amount);
	}

	// lifecycle methods
	/// @notice Function will transfer payable value to new admin contract if admin contract is replaced else will be stored this the exisitng admin contract as it's balance
	/// @dev A payable fallback method
	function() public payable {
		if (wasReplaced) {
			newTwoKeyAdminAddress.transfer(msg.value);
		}
	}

    /// @notice Function will transfer contract balance to owner if contract was never replaced else will transfer the funds to the new Admin contract address  
	function destroy() public adminsVotingApproved {
		if (!wasReplaced)
			selfdestruct(owner);
		else
			selfdestruct(newTwoKeyAdminAddress);
	}

	// modifiers
    /// @notice Modifier will revert if calling address is not a member of electorateAdmins 
	modifier adminsVotingApproved() {
		require(msg.sender == electorateAdmins);
	    _;
	}

    /// @notice Modifier will revert if contract is already replaced 
	modifier wasNotReplaced() {
		require(!wasReplaced);
		_;
	}

    /// @notice Function to whitelist address as an authorized user for twoKeyEventSource contract
	/// @param _address is address of user
	function twoKeyEventSourceAddAuthorizedAddress(address _address) public {
		require(_address != address(0));
		twoKeyEventSource.addAuthorizedAddress(_address);
	}

    /// @notice Function to add twoKeyEventSource contract to twoKeyAdmin 
	/// @dev We're requiring twoKeyEventSource contract address different from address 0 as it is required to be deployed before calling this method
	/// @param _twoKeyEventSource is address of twoKeyEventSource contract address
	function addTwoKeyEventSource(address _twoKeyEventSource) public {
		require(_twoKeyEventSource != address(0));
		twoKeyEventSource = TwoKeyEventSource(_twoKeyEventSource);
	}

    /// @notice Function to whitelist contract address for Event Source contract 
	/// @dev We're requiring contract address different from address 0 as it is required to be deployed before calling this method
	/// @param _contractAddress is address of a contract
	function twoKeyEventSourceAddAuthorizedContracts(address _contractAddress) public {
		require(_contractAddress != address(0));
		twoKeyEventSource.addContract(_contractAddress);
	}

    /// @notice Function to add/update name - address pair from twoKeyAdmin
	/// @param _name is name of user
	/// @param _addr is address of user
    function addNameToReg(string _name, address _addr) public {
    	twoKeyReg.addName(_name, _addr);
    }

	// modifier for admin call check
	//<TBD> may be owner
    
    /// @notice Function to set twoKeyExchange contract address 
	/// @dev We're requiring twoKeyExchange contract address different from address 0 as it is required to be deployed before calling this method
	/// @param _exchange is address of twoKeyExchange contract address
	function setTwoKeyExchange(address _exchange) public adminsVotingApproved {
		require(_exchange != address(0));
    	exchange = TwoKeyUpgradableExchange(exchange);
    	
    }

    // modifier for admin call check
	//<TBD> may be owner

    /// @notice Function to set twoKeyEconomy contract address 
	/// @dev We're requiring twoKeyEconomy contract address different from address 0 as it is required to be deployed before calling this method
	/// @param _economy is address of twoKeyEconomy contract address
	function setTwoKeyEconomy(address _economy) public   {
		require(_economy != address(0));
		economy = TwoKeyEconomy(_economy);
	}

    /// View function - doesn't cost any gas to be executed
	/// @notice Function to get Ether Balance of given address 
	/// @param _addr is address of user
	/// @return Ether balance of given address
	function getEtherBalanceOfAnAddress(address _addr) public view returns (uint256){
		return address(_addr).balance;
	}
	// modifier for admin call check
	//<TBD> may be owner
	
	/// View function - doesn't cost any gas to be executed
	/// @notice Function to fetch twoKeyEconomy contract address 
	/// @return _economy is address of twoKeyEconomy contract 
    function getTwoKeyEconomy () public view  returns(address _economy)  {
    	return address(economy);
    }

	// modifier for admin call check
	//<TBD> may be owner

	/// @notice Function to set twoKeyReg contract address 
	/// @dev We're requiring twoKeyReg contract address different from address 0 as it is required to be deployed before calling this method
	/// @param _address is address of twoKeyReg contract address 
	function setTwoKeyReg(address _address) public  {
		require(_address != address(0));
		twoKeyReg = TwoKeyReg(_address);

	}

    // modifier for admin call check
	//<TBD> may be owner
	
	/// View function - doesn't cost any gas to be executed
	/// @notice Function to fetch twoKeyReg contract address 
	/// @return _address is address of twoKeyReg contract
    function getTwoKeyReg () public view returns(address _address)  {
    	return address(twoKeyReg);
    }
    
} 