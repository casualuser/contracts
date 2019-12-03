const TwoKeyAcquisitionCampaignERC20 = artifacts.require('TwoKeyAcquisitionCampaignERC20');
const TwoKeyConversionHandler = artifacts.require('TwoKeyConversionHandler');
const TwoKeyExchangeRateContract = artifacts.require('TwoKeyExchangeRateContract');
const TwoKeyUpgradableExchange = artifacts.require('TwoKeyUpgradableExchange');
const TwoKeyAcquisitionLogicHandler = artifacts.require('TwoKeyAcquisitionLogicHandler');
const TwoKeyRegistry = artifacts.require('TwoKeyRegistry');
const TwoKeySingletonesRegistry = artifacts.require('TwoKeySingletonesRegistry');
const TwoKeyCampaignValidator = artifacts.require('TwoKeyCampaignValidator');
const TwoKeyEconomy = artifacts.require('TwoKeyEconomy');
const TwoKeyDonationCampaign = artifacts.require('TwoKeyDonationCampaign');
const TwoKeyDonationConversionHandler = artifacts.require('TwoKeyDonationConversionHandler');
const TwoKeyPurchasesHandler = artifacts.require('TwoKeyPurchasesHandler');
const TwoKeyDonationLogicHandler = artifacts.require('TwoKeyDonationLogicHandler');

const Call = artifacts.require('Call');
const IncentiveModels = artifacts.require('IncentiveModels');

const { incrementVersion, getConfigForTheBranch, checkIsHardRedeploy } = require('../helpers');


module.exports = function deploy(deployer) {

    // let isHardRedeploy = checkIsHardRedeploy(process.argv);
    // console.log(isHardRedeploy);
    let TWO_KEY_SINGLETON_REGISTRY_ADDRESS;
    let version;

    if(deployer.network.startsWith('dev') || deployer.network.startsWith('public')) {
        deployer.deploy(TwoKeyConversionHandler)
            .then(() => TwoKeyConversionHandler.deployed())
            .then(() => deployer.deploy(TwoKeyPurchasesHandler))
            .then(() => TwoKeyPurchasesHandler.deployed())
            .then(() => deployer.link(Call, TwoKeyAcquisitionLogicHandler))
            .then(() => deployer.link(Call, TwoKeyAcquisitionCampaignERC20))
            .then(() => deployer.deploy(TwoKeyAcquisitionLogicHandler))
            .then(() => deployer.deploy(TwoKeyAcquisitionCampaignERC20))
            .then(() => TwoKeyAcquisitionCampaignERC20.deployed())
            .then(() => true)
            .then(() => deployer.link(Call, TwoKeyDonationCampaign))
            .then(() => deployer.deploy(TwoKeyDonationCampaign))
            .then(() => TwoKeyDonationCampaign.deployed())
            .then(() => deployer.deploy(TwoKeyDonationConversionHandler))
            .then(() => TwoKeyDonationConversionHandler.deployed())
            .then(() => deployer.link(IncentiveModels, TwoKeyDonationLogicHandler))
            .then(() => deployer.link(Call, TwoKeyDonationLogicHandler))
            .then(() => deployer.deploy(TwoKeyDonationLogicHandler))
            .then(() => TwoKeyDonationLogicHandler.deployed())
            .then(async () => {
                console.log('... Adding implementation versions of Donation campaigns');
                TWO_KEY_SINGLETON_REGISTRY_ADDRESS = TwoKeySingletonesRegistry.address;
                let instance = await TwoKeySingletonesRegistry.at(TWO_KEY_SINGLETON_REGISTRY_ADDRESS);

                await new Promise(async(resolve,reject) => {
                    try {
                        //
                        version = await instance.getLatestAddedContractVersion("TwoKeyDonationCampaign");
                        version = incrementVersion(version);

                        console.log('Version :' + version);
                        let txHash = await instance.addVersion('TwoKeyDonationCampaign', version, TwoKeyDonationCampaign.address);
                        txHash = await instance.addVersion('TwoKeyDonationConversionHandler', version, TwoKeyDonationConversionHandler.address);
                        txHash = await instance.addVersion('TwoKeyDonationLogicHandler', version, TwoKeyDonationLogicHandler.address);

                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                })
            })
            .then(async () => {
                let instance = await TwoKeySingletonesRegistry.at(TWO_KEY_SINGLETON_REGISTRY_ADDRESS);
                console.log("... Adding implementation versions of Acquisition campaigns");
                await new Promise(async(resolve,reject) => {
                    try {

                        version = await instance.getLatestAddedContractVersion("TwoKeyDonationCampaign");
                        version = incrementVersion(version);

                        let txHash = await instance.addVersion('TwoKeyAcquisitionLogicHandler', version, TwoKeyAcquisitionLogicHandler.address);
                        txHash = await instance.addVersion('TwoKeyConversionHandler', version, TwoKeyConversionHandler.address);
                        txHash = await instance.addVersion('TwoKeyAcquisitionCampaignERC20', version, TwoKeyAcquisitionCampaignERC20.address);
                        txHash = await instance.addVersion('TwoKeyPurchasesHandler', version, TwoKeyPurchasesHandler.address);

                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                })
            })
            .then(async () => {
                await new Promise(async(resolve,reject) => {
                    try {
                        if(version === "1.0.0") {
                            let instance = await TwoKeySingletonesRegistry.at(TWO_KEY_SINGLETON_REGISTRY_ADDRESS);
                            console.log("Let's approve all initial versions for campaigns");

                            let txHash = await instance.approveCampaignVersionDuringCreation("DONATION");
                            txHash = await instance.approveCampaignVersionDuringCreation("TOKEN_SELL");
                            resolve(txHash);
                        } else {
                            resolve(true);
                        }
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .then(() => true);
    }

}
