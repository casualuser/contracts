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

const Call = artifacts.require('Call');
const IncentiveModels = artifacts.require('IncentiveModels');

const fs = require('fs');
const path = require('path');

const proxyFile = path.join(__dirname, '../build/contracts/proxyAddresses.json');


module.exports = function deploy(deployer) {
    if(!deployer.network.startsWith('private') && !deployer.network.startsWith('plasma')) {
        const { network_id } = deployer;
        let x = 1;
        let json = JSON.parse(fs.readFileSync(proxyFile, {encoding: 'utf-8'}));
        deployer.deploy(TwoKeyConversionHandler,
            12345, 1012019, 180, 6, 180)
            .then(() => TwoKeyConversionHandler.deployed())
            .then(() => deployer.link(Call, TwoKeyAcquisitionLogicHandler))
            .then(() => deployer.link(Call, TwoKeyAcquisitionCampaignERC20))
            .then(() => deployer.deploy(TwoKeyAcquisitionLogicHandler,
                12, 15, 1, 12345, 15345, 5, 'USD',
                TwoKeyEconomy.address, json.TwoKeyAdmin[network_id].Proxy))
            .then(() => deployer.deploy(TwoKeyAcquisitionCampaignERC20,
                TwoKeySingletonesRegistry.address,
                TwoKeyAcquisitionLogicHandler.address,
                TwoKeyConversionHandler.address,
                json.TwoKeyAdmin[network_id].Proxy,
                TwoKeyEconomy.address,
                [5, 1],
                )
            )
            .then(() => TwoKeyAcquisitionCampaignERC20.deployed())
            .then(() => true)
            .then(() => deployer.deploy(TwoKeyDonationConversionHandler,
                'Nikoloken',
                'NTKN',
                ))
            .then(() => deployer.link(IncentiveModels, TwoKeyDonationCampaign))
            .then(() => deployer.link(Call, TwoKeyDonationCampaign))
            .then(() => deployer.deploy(TwoKeyDonationCampaign,
                json.TwoKeyAdmin[network_id].Proxy,
                'Donation for Something',
                [
                    5,
                    12345,
                    1231112,
                    10000,
                    100000000,
                    10000000000000,
                    5
                ],
                false,
                false,
                false,
                TwoKeySingletonesRegistry.address,
                TwoKeyDonationConversionHandler.address,
                0
                ))
            .then(async () => {
                console.log("... Adding TwoKeyAcquisitionCampaign bytecodes to be valid in the TwoKeyValidator contract");
                await new Promise(async (resolve, reject) => {
                    try {
                        let txHash = await TwoKeyCampaignValidator.at(json.TwoKeyCampaignValidator[network_id].Proxy)
                            .addValidBytecodes(
                                [
                                    TwoKeyAcquisitionCampaignERC20.address,
                                    TwoKeyConversionHandler.address,
                                    TwoKeyAcquisitionLogicHandler.address,
                                    TwoKeyDonationCampaign.address,
                                    TwoKeyDonationConversionHandler.address
                                ],
                                [
                                    '0x54776f4b65794163717569736974696f6e43616d706169676e00000000000000', //TwoKeyAcquisitionCampaign
                                    '0x54776f4b6579436f6e76657273696f6e48616e646c6572000000000000000000', //TwoKeyConversionHandler
                                    '0x54776f4b65794163717569736974696f6e4c6f67696348616e646c6572000000', //TwoKeyAcquisitionLogicHandler
                                    '0x54776f4b6579446f6e6174696f6e43616d706169676e00000000000000000000', //TwoKeyDonationCampaign
                                    '0x54776f4b6579446f6e6174696f6e436f6e76657273696f6e48616e646c657200'  //TwoKeyDonationConversionHandler
                                ]
                            );
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .then(() => true);
    }
}
