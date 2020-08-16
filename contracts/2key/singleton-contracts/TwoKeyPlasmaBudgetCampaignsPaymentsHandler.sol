pragma solidity ^0.4.24;

import "../upgradability/Upgradeable.sol";
import "../interfaces/storage-contracts/ITwoKeyPlasmaBudgetCampaignsPaymentsHandlerStorage.sol";

import "../interfaces/ITwoKeyPlasmaFactory.sol";
import "../interfaces/ITwoKeySingletoneRegistryFetchAddress.sol";
import "../interfaces/ITwoKeyMaintainersRegistry.sol";
import "../interfaces/ITwoKeyPlasmaCampaign.sol";
import "../interfaces/ITwoKeyPlasmaEventSource.sol";

import "../libraries/SafeMath.sol";

contract TwoKeyPlasmaBudgetCampaignsPaymentsHandler is Upgradeable {

    using SafeMath for *;

    bool initialized;

    address public TWO_KEY_PLASMA_SINGLETON_REGISTRY;

    string constant _numberOfCycles = "numberOfCycles";

    // Mapping cycle id to total non rebalanced amount payment
    string constant _distributionCycle2TotalNonRebalancedPayment = "distributionCycle2TotalNonRebalancedPayment";

    // Mapping cycle id to total rebalanced amount payment
    string constant _distributionCycleToTotalRebalancedPayment = "distributionCycleToTotalRebalancedPayment";

    // Mapping if distribution cycle is submitted
    string constant _distributionCyclePaymentSubmitted = "distributionCyclePaymentSubmitted";

    // Mapping distribution cycle to referrers being paid in that cycle
    string constant _distributionCycleIdToReferrersPaid = "distributionCycleIdToReferrersPaid";

    // Mapping how much referrer received in distribution cycle
    string constant _referrer2CycleId2TotalDistributedInCycle = "referrer2CycleId2TotalDistributedInCycle";

    // Mapping referrer to all campaigns he participated at and are having pending distribution
    string constant _referrer2pendingCampaignAddresses = "referrer2pendingCampaignAddresses";

    // Mapping referrer to all campaigns that are in progress of distribution
    string constant _referrer2inProgressCampaignAddress = "referrer2inProgressCampaignAddress";

    // Mapping referrer to how much rebalanced amount he has pending
    string constant _referrer2cycleId2rebalancedAmount = "referrer2cycleId2rebalancedAmount";


    ITwoKeyPlasmaBudgetCampaignsPaymentsHandlerStorage public PROXY_STORAGE_CONTRACT;


    /**
     * @notice          Modifier which will be used to restrict calls to only maintainers
     */
    modifier onlyMaintainer {
        require(
            ITwoKeyMaintainersRegistry(getAddressFromTwoKeySingletonRegistry("TwoKeyPlasmaMaintainersRegistry"))
            .checkIsAddressMaintainer(msg.sender) == true
        );
        _;
    }

    /**
     * @notice          Modifier restricting access to the function only to campaigns
     *                  created using TwoKeyPlasmaFactory contract
     */
    modifier onlyBudgetCampaigns {
        require(
            ITwoKeyPlasmaFactory(getAddressFromTwoKeySingletonRegistry("TwoKeyPlasmaFactory"))
            .isCampaignCreatedThroughFactory(msg.sender)
        );
        _;
    }


    function setInitialParams(
        address _twoKeyPlasmaSingletonRegistry,
        address _proxyStorage
    )
    public
    {
        require(initialized == false);

        TWO_KEY_PLASMA_SINGLETON_REGISTRY = _twoKeyPlasmaSingletonRegistry;
        PROXY_STORAGE_CONTRACT = ITwoKeyPlasmaBudgetCampaignsPaymentsHandlerStorage(_proxyStorage);

        initialized = true;
    }

    /**
     * ------------------------------------------------
     *        Internal getters and setters
     * ------------------------------------------------
     */


    function getUint(
        bytes32 key
    )
    internal
    view
    returns (uint)
    {
        return PROXY_STORAGE_CONTRACT.getUint(key);
    }

    function setUint(
        bytes32 key,
        uint value
    )
    internal
    {
        PROXY_STORAGE_CONTRACT.setUint(key,value);
    }

    function getBool(
        bytes32 key
    )
    internal
    view
    returns (bool)
    {
        return PROXY_STORAGE_CONTRACT.getBool(key);
    }

    function setBool(
        bytes32 key,
        bool value
    )
    internal
    {
        PROXY_STORAGE_CONTRACT.setBool(key,value);
    }

    function getAddress(
        bytes32 key
    )
    internal
    view
    returns (address)
    {
        return PROXY_STORAGE_CONTRACT.getAddress(key);
    }

    function setAddress(
        bytes32 key,
        address value
    )
    internal
    {
        PROXY_STORAGE_CONTRACT.setAddress(key,value);
    }


    function getAddressArray(
        bytes32 key
    )
    internal
    view
    returns (address [])
    {
        return PROXY_STORAGE_CONTRACT.getAddressArray(key);
    }


    function setAddressArray(
        bytes32 key,
        address [] addresses
    )
    internal
    {
        PROXY_STORAGE_CONTRACT.setAddressArray(key, addresses);
    }


    function copyAddressArray(
        bytes32 keyArrayToCopy,
        bytes32 keyArrayToStore
    )
    internal
    {
        PROXY_STORAGE_CONTRACT.setAddressArray(
            keyArrayToStore,
            getAddressArray(keyArrayToCopy)
        );
    }



    function pushAddressToArray(
        bytes32 key,
        address value
    )
    internal
    {
        address[] memory currentArray = PROXY_STORAGE_CONTRACT.getAddressArray(key);

        uint newLength = currentArray.length + 1;

        address [] memory newArray = new address[](newLength);

        uint i;

        for(i=0; i<newLength - 1; i++) {
            newArray[i] = currentArray[i];
        }

        // Append the last value there.
        newArray[i] = value;

        // Store this array
        PROXY_STORAGE_CONTRACT.setAddressArray(key, newArray);
    }

    /**
     * @notice          Function to delete address array for specific influencer
     */
    function deleteAddressArray(
        bytes32 key
    )
    internal
    {
        address [] memory emptyArray = new address[](0);
        PROXY_STORAGE_CONTRACT.setAddressArray(key, emptyArray);
    }

    /**
     * @notice          Function to get address from TwoKeyPlasmaSingletonRegistry
     *
     * @param           contractName is the name of the contract
     */
    function getAddressFromTwoKeySingletonRegistry(
        string contractName
    )
    internal
    view
    returns (address)
    {
        return ITwoKeySingletoneRegistryFetchAddress(TWO_KEY_PLASMA_SINGLETON_REGISTRY)
        .getContractProxyAddress(contractName);
    }

    function deleteReferrerPendingCampaigns(
        bytes32 key
    )
    internal
    {
        deleteAddressArray(key);
    }

    function setReferrerToRebalancedAmountPendingForCycle(
        address referrer,
        uint cycleId,
        uint amount
    )
    internal
    {
        setUint(
            keccak256(_referrer2cycleId2rebalancedAmount, referrer, cycleId),
            amount
        );
    }

    function setReferrersPerDistributionCycle(
        uint cycleId,
        address [] referrers
    )
    internal
    {
        setAddressArray(
            keccak256(_distributionCycleIdToReferrersPaid, cycleId),
            referrers
        );
    }

    function setTotalNonRebalancedPayoutForCycle(
        uint cycleId,
        uint totalNonRebalancedPayout
    )
    internal
    {
        setUint(
            keccak256(_distributionCycle2TotalNonRebalancedPayment, cycleId),
            totalNonRebalancedPayout
        );
    }

    function addNewDistributionCycle()
    internal
    returns (uint)
    {
        bytes32 key = keccak256(_numberOfCycles);

        uint incrementedNumberOfCycles = getUint(key) + 1;

        setUint(
            key,
            incrementedNumberOfCycles
        );

        return incrementedNumberOfCycles;
    }

    /**
     * ------------------------------------------------------------------------------------------------
     *              EXTERNAL FUNCTION CALLS - MAINTAINER ACTIONS CAMPAIGN ENDING FUNNEL
     * ------------------------------------------------------------------------------------------------
     */

    /**
     * @notice          Function where maintainer will submit N calls and store campaign
     *                  inside array of campaigns for influencers that it's not distributed but ended
     *
     *                  END CAMPAIGN OPERATION ON PLASMA CHAIN
     * @param           campaignPlasma is the plasma address of campaign
     * @param           start is the start index
     * @param           end is the ending index
     */
    function markCampaignAsDoneAndAssignToActiveInfluencers(
        address campaignPlasma,
        uint start,
        uint end
    )
    public
    onlyMaintainer
    {
        address twoKeyPlasmaEventSource = getAddressFromTwoKeySingletonRegistry("TwoKeyPlasmaEventSource");

        address[] memory influencers = ITwoKeyPlasmaCampaign(campaignPlasma).getActiveInfluencers(start,end);

        uint i;
        uint len = influencers.length;

        for(i=0; i<len; i++) {
            address referrer = influencers[i];

            ITwoKeyPlasmaEventSource(twoKeyPlasmaEventSource).emitAddedPendingRewards(
                campaignPlasma,
                referrer,
                ITwoKeyPlasmaCampaign(campaignPlasma).getReferrerPlasmaBalance(referrer)
            );

            bytes32 key = keccak256(
                _referrer2pendingCampaignAddresses,
                referrer
            );

            pushAddressToArray(key, campaignPlasma);
        }
    }


    /**
     * @notice          At the point when we want to do the payment
     */
    function rebalanceInfluencerRatesAndPrepareForRewardsDistribution(
        address [] referrers,
        uint currentRate2KEY
    )
    public
    onlyMaintainer
    {
        // Counters
        uint i;
        uint j;

        // Increment number of distribution cycles and get the id
        uint cycleId = addNewDistributionCycle();

        // Calculate how much total payout would be for all referrers together in case there was no rebalancing
        uint amountToBeDistributedInCycleNoRebalanced;
        uint amountToBeDistributedInCycleRebalanced;

        for(i=0; i<referrers.length; i++) {
            // Load current referrer
            address referrer = referrers[i];
            // Get all the campaigns of specific referrer
            address[] memory referrerCampaigns = getCampaignsReferrerHasPendingBalances(referrer);
            // Calculate how much is total payout for this referrer
            uint referrerTotalPayoutAmount = 0;
            // Iterate through campaigns
            for(j = 0; j < referrerCampaigns.length; j++) {
                // Load campaign address
                address campaignAddress = referrerCampaigns[j];

                uint rebalancedAmount;
                uint nonRebalancedAmount;

                // Update on plasma campaign contract rebalancing ratio at this moment
                (rebalancedAmount, nonRebalancedAmount) = ITwoKeyPlasmaCampaign(campaignAddress).computeAndSetRebalancingRatioForReferrer(
                    referrer,
                    currentRate2KEY
                );

                referrerTotalPayoutAmount = referrerTotalPayoutAmount.add(rebalancedAmount);

                // Update total payout to be paid in case there was no rebalancing
                amountToBeDistributedInCycleNoRebalanced = amountToBeDistributedInCycleNoRebalanced.add(nonRebalancedAmount);
            }

            // First copy address array from pending to inProgress.
            copyAddressArray(
                keccak256(_referrer2pendingCampaignAddresses, referrer),
                keccak256(_referrer2inProgressCampaignAddress, referrer)
            );

            // Delete referrer campaigns which are pending rewards
            deleteReferrerPendingCampaigns(
                keccak256(_referrer2pendingCampaignAddresses, referrer)
            );

            amountToBeDistributedInCycleRebalanced = amountToBeDistributedInCycleRebalanced.add(referrerTotalPayoutAmount);

            // Store referrer total payout amount for this cycle
            setReferrerToRebalancedAmountPendingForCycle(
                referrer,
                cycleId,
                referrerTotalPayoutAmount
            );
        }

        // Store total payout
        setTotalNonRebalancedPayoutForCycle(
            cycleId,
            amountToBeDistributedInCycleNoRebalanced
        );

        // TODO: setTotalRebalancedPayoutForCycle as well
        // Store all influencers for this distribution cycle.
        setReferrersPerDistributionCycle(cycleId,referrers);
    }

    //TODO: The last function in distribution cycle has to do following:
    // 1. move from inProgress to finished
    // 2. mark all campaigns that specific referrers have received tokens
    // 3. Emit events that rewards aree being paid (emitPaidPendingRewards)
    /**
     * ------------------------------------------------
     *        Public getters
     * ------------------------------------------------
     */

    /**
     * @notice          Function to get pending balances for influencers to be distributed
     * @param           referrers is the array of referrers passed previously to function
     *                  rebalanceInfluencerRatesAndPrepareForRewardsDistribution
     */
    function getPendingReferrersPaymentInformationForCycle(
        address [] referrers,
        uint cycleId
    )
    public
    view
    returns (uint[],uint,uint)
    {
        uint numberOfReferrers = referrers.length;
        uint [] memory balances = new uint[](numberOfReferrers);
        uint totalRebalanced;
        uint i;
        for(i = 0; i < numberOfReferrers; i++) {
            balances[i] = getReferrerToTotalRebalancedAmountForCycleId(referrers[i], cycleId);
            totalRebalanced = totalRebalanced.add(balances[i]);
        }

        return (
            balances,
            totalRebalanced,
            getTotalNonRebalancedPayoutForCycle(cycleId)
        );
    }


    /**
     * @notice          Function to get campaign where referrer is having pending
     *                  balance. If empty array, means all rewards are already being
     *                  distributed.
     * @param           referrer is the plasma address of referrer
     */
    function getCampaignsReferrerHasPendingBalances(
        address referrer
    )
    public
    view
    returns (address[]) {

        bytes32 key = keccak256(
            _referrer2pendingCampaignAddresses,
            referrer
        );

        return getAddressArray(key);
    }

    //TODO: Use function above to iterate through all campaigns and fetch their balances and return total

    /**
     * @notice          Function to get how much rebalanced earnings referrer got
     *                  for specific distribution cycle id
     * @param           referrer is the referrer plasma address
     * @param           cycleId is distribution cycle id
     */
    function getReferrerToTotalRebalancedAmountForCycleId(
        address referrer,
        uint cycleId
    )
    public
    view
    returns (uint)
    {
        return getUint(
            keccak256(
                _referrer2cycleId2rebalancedAmount,
                referrer,
                cycleId
            )
        );
    }

    /**
     * @notice          Function to get total payout for specific cycle non rebalanced
     * @param           cycleId is the id of distribution cycle
     */
    function getTotalNonRebalancedPayoutForCycle(
        uint cycleId
    )
    public
    view
    returns (uint)
    {
        return getUint(
            keccak256(_distributionCycle2TotalNonRebalancedPayment, cycleId)
        );
    }

    /**
     * @notice          Function to get exact amount of distribution cycles
     */
    function getNumberOfDistributionCycles()
    public
    view
    returns (uint)
    {
        getUint(keccak256(_numberOfCycles));
    }

}
