pragma solidity ^0.4.24;

contract TwoKeyLockupContract {

    uint tokenDistributionDate;
    uint maxDistributionDateShiftInDays;
    uint tokens;
    address converter;
    address contractor;
    bool changed = false;
    address twoKeyAcquisitionCampaignERC20Address;


    modifier onlyContractor() {
        require(msg.sender == contractor);
        _;
    }

    modifier onlyConverter() {
        require(msg.sender == converter);
        _;
    }

    modifier onlyAcquisitionCampaign() {
        require(msg.sender == twoKeyAcquisitionCampaignERC20Address);
        _;
    }

    constructor(uint _tokenDistributionDate, uint _maxDistributionDateShiftInDays, uint _tokens, address _converter, address _contractor, address _acquisitionCampaignERC20Address) public {
        tokenDistributionDate = _tokenDistributionDate;
        maxDistributionDateShiftInDays = _maxDistributionDateShiftInDays;
        tokens = _tokens;
        converter = _converter;
        contractor = _contractor;
        twoKeyAcquisitionCampaignERC20Address = _acquisitionCampaignERC20Address;
    }

    function changeTokenDistributionDate(uint _newDate) public onlyContractor {
        require(changed == false);
        require(_newDate - (maxDistributionDateShiftInDays * (1 days)) <= tokenDistributionDate);
        require(now < tokenDistributionDate);
        changed = true;
        tokenDistributionDate = _newDate;
    }

    function transferFungibleAsset(address _assetContractERC20, uint256 _amount) public onlyConverter returns (bool) {
        require(tokens >= _amount);
        require(block.timestamp > tokenDistributionDate);
        _assetContractERC20.call(
            bytes4(keccak256(abi.encodePacked("transfer(address,uint256)"))),
            converter, _amount
        );
        tokens = tokens - _amount;
        return true;
    }

    function areTokensUnlocked() public onlyConverter returns (bool) {
        if(block.timestamp > tokenDistributionDate) {
            return true;
        }
        return false;
    }
    //TODO: Emit events through TwoKeyEventSource

    function cancelCampaign() public onlyAcquisitionCampaign {
        require(block.timestamp < tokenDistributionDate);
        // Get the tokens back to campaign
        _assetContractERC20.call(
            bytes4(keccak256(abi.encodePacked("transfer(address,uint256)"))),
            twoKeyAcquisitionCampaignERC20Address, tokens
        );
        selfdestruct(twoKeyAcquisitionCampaignERC20Address);
    }

}
