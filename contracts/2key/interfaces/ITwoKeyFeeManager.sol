pragma solidity ^0.4.24;

contract ITwoKeyFeeManager {
    function payDebtWhenConvertingOrWithdrawingProceeds(address _plasmaAddress, uint _debtPaying) public payable;
    function getDebtForUser(address _userPlasma) public view returns (uint);
    function payDebtWith2Key(address _plasmaAddress) public;
    function payDebtWithDAI(address _plasmaAddress, uint _debtAmount) public;
    function setRegistrationFeeForUser(address _plasmaAddress, uint _registrationFee) public;
}
