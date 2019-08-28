const TwoKeyEconomy = artifacts.require('TwoKeyEconomy');
const TwoKeyUpgradableExchange = artifacts.require('TwoKeyUpgradableExchange');
const TwoKeyAdmin = artifacts.require('TwoKeyAdmin');
const TwoKeyEventSource = artifacts.require('TwoKeyEventSource');
const TwoKeyRegistry = artifacts.require('TwoKeyRegistry');
const TwoKeyCongress = artifacts.require('TwoKeyCongress');
const TwoKeySingletonesRegistry = artifacts.require('TwoKeySingletonesRegistry');
const TwoKeyExchangeRateContract = artifacts.require('TwoKeyExchangeRateContract');
const TwoKeyPlasmaSingletoneRegistry = artifacts.require('TwoKeyPlasmaSingletoneRegistry');
const TwoKeyBaseReputationRegistry = artifacts.require('TwoKeyBaseReputationRegistry');
const TwoKeyCommunityTokenPool = artifacts.require('TwoKeyCommunityTokenPool');
const TwoKeyDeepFreezeTokenPool = artifacts.require('TwoKeyDeepFreezeTokenPool');
const TwoKeyLongTermTokenPool = artifacts.require('TwoKeyLongTermTokenPool');
const TwoKeyCampaignValidator = artifacts.require('TwoKeyCampaignValidator');
const TwoKeyFactory = artifacts.require('TwoKeyFactory');
const KyberNetworkTestMockContract = artifacts.require('KyberNetworkTestMockContract');
const TwoKeyMaintainersRegistry = artifacts.require('TwoKeyMaintainersRegistry');
const TwoKeySignatureValidator = artifacts.require('TwoKeySignatureValidator');

/**
 * Upgradable singleton storage contracts
 */
const TwoKeyUpgradableExchangeStorage = artifacts.require('TwoKeyUpgradableExchangeStorage');
const TwoKeyCampaignValidatorStorage = artifacts.require('TwoKeyCampaignValidatorStorage');
const TwoKeyEventSourceStorage = artifacts.require("TwoKeyEventSourceStorage");
const TwoKeyAdminStorage = artifacts.require('TwoKeyAdminStorage');
const TwoKeyFactoryStorage = artifacts.require('TwoKeyFactoryStorage');
const TwoKeyMaintainersRegistryStorage = artifacts.require('TwoKeyMaintainersRegistryStorage');
const TwoKeyExchangeRateStorage = artifacts.require('TwoKeyExchangeRateStorage');
const TwoKeyBaseReputationRegistryStorage = artifacts.require('TwoKeyBaseReputationRegistryStorage');
const TwoKeyCommunityTokenPoolStorage = artifacts.require('TwoKeyCommunityTokenPoolStorage');
const TwoKeyDeepFreezeTokenPoolStorage = artifacts.require('TwoKeyDeepFreezeTokenPoolStorage');
const TwoKeyLongTermTokenPoolStorage = artifacts.require('TwoKeyLongTermTokenPoolStorage');
const TwoKeyRegistryStorage = artifacts.require('TwoKeyRegistryStorage');
const TwoKeySignatureValidatorStorage = artifacts.require('TwoKeySignatureValidatorStorage');

const TwoKeyPlasmaEvents = artifacts.require('TwoKeyPlasmaEvents');
const TwoKeyPlasmaEventsStorage = artifacts.require('TwoKeyPlasmaEventsStorage');
const TwoKeyPlasmaRegistry = artifacts.require('TwoKeyPlasmaRegistry');
const TwoKeyPlasmaRegistryStorage = artifacts.require('TwoKeyPlasmaRegistryStorage');
const TwoKeyPlasmaMaintainersRegistryStorage = artifacts.require('TwoKeyPlasmaMaintainersRegistryStorage');
const TwoKeyPlasmaMaintainersRegistry = artifacts.require('TwoKeyPlasmaMaintainersRegistry');

const Call = artifacts.require('Call');
const IncentiveModels = artifacts.require('IncentiveModels');

const fs = require('fs');
const path = require('path');

const proxyFile = path.join(__dirname, '../configurationFiles/proxyAddresses.json');
const deploymentConfigFile = path.join(__dirname, '../configurationFiles/deploymentConfig.json');
const addressesFile = path.join(__dirname, '../configurationFiles/contractNamesToProxyAddresses.json');

module.exports = function deploy(deployer) {
    const { network_id } = deployer;

    let fileObject = {};
    if (fs.existsSync(proxyFile)) {
        fileObject = JSON.parse(fs.readFileSync(proxyFile, { encoding: 'utf8' }));
    }

    let deploymentObject = {};
    if( fs.existsSync(deploymentConfigFile)) {
        deploymentObject = JSON.parse(fs.readFileSync(deploymentConfigFile, {encoding: 'utf8'}));
    }

    let deploymentNetwork;
    if(deployer.network.startsWith('dev') || deployer.network.startsWith('plasma-test')) {
        deploymentNetwork = 'dev-local-environment'
    } else if (deployer.network.startsWith('public') || deployer.network.startsWith('plasma') || deployer.network.startsWith('private')) {
        deploymentNetwork = 'ropsten-environment';
    }


    let contractNameToProxyAddress = {};

    let contractStorageArtifacts = {
        TwoKeyUpgradableExchangeStorage,
        TwoKeyAdminStorage,
        TwoKeyEventSourceStorage,
        TwoKeyRegistryStorage,
        TwoKeyExchangeRateStorage,
        TwoKeyBaseReputationRegistryStorage,
        TwoKeyCommunityTokenPoolStorage,
        TwoKeyDeepFreezeTokenPoolStorage,
        TwoKeyLongTermTokenPoolStorage,
        TwoKeyCampaignValidatorStorage,
        TwoKeyFactoryStorage,
        TwoKeyMaintainersRegistryStorage,
        TwoKeySignatureValidatorStorage
    };

    let contractLogicArtifacts = {
         TwoKeyUpgradableExchange,
         TwoKeyAdmin,
         TwoKeyEventSource,
         TwoKeyRegistry,
         TwoKeyExchangeRateContract,
         TwoKeyBaseReputationRegistry,
         TwoKeyCommunityTokenPool,
         TwoKeyDeepFreezeTokenPool,
         TwoKeyLongTermTokenPool,
         TwoKeyCampaignValidator,
         TwoKeyFactory,
         TwoKeyMaintainersRegistry,
         TwoKeySignatureValidator
    };

    /**
     * Function to determine and return truffle build of selected contract
     * @type {function(*)}
     */
    const getContractPerName = ((contractName) => {
        if(contractLogicArtifacts[contractName]) {
            return contractLogicArtifacts[contractName]
        } else if (contractStorageArtifacts[contractName]) {
            return contractStorageArtifacts[contractName]
        }
        else {
            return "Wrong name";
        }
    });




    const maintainerAddresses = deploymentObject[deploymentNetwork].maintainers;
    const INITIAL_VERSION_OF_ALL_SINGLETONS = "1.0.0";


    if (deployer.network.startsWith('dev') || deployer.network.startsWith('public.') || deployer.network.startsWith('ropsten')) {
            deployer.then(async () => {
                let registry = TwoKeySingletonesRegistry.at(TwoKeySingletonesRegistry.address);

                let upgradableLogicContracts = Object.keys(contractLogicArtifacts);
                let upgradableStorageContracts = Object.keys(contractStorageArtifacts);

                /* eslint-disable no-await-in-loop */
                for (let i = 0; i < upgradableLogicContracts.length; i++) {
                    await new Promise(async (resolve, reject) => {
                        try {
                            console.log('-----------------------------------------------------------------------------------');
                            console.log('... Adding ' + upgradableLogicContracts[i] + ' to Proxy registry as valid implementation');
                            let contractName = upgradableLogicContracts[i];
                            let contractStorageName = upgradableStorageContracts[i];

                            let txHash = await registry.addVersionDuringCreation(
                                contractName,
                                contractStorageName,
                                getContractPerName(contractName).address,
                                getContractPerName(contractStorageName).address,
                                INITIAL_VERSION_OF_ALL_SINGLETONS
                            );

                            let { logs } = await registry.createProxy(
                                contractName,
                                contractStorageName,
                                INITIAL_VERSION_OF_ALL_SINGLETONS
                            );

                            let { logicProxy, storageProxy } = logs.find(l => l.event === 'ProxiesDeployed').args;

                            const jsonObject = fileObject[contractName] || {};
                            jsonObject[network_id] = {
                                'implementationAddressLogic': getContractPerName(contractName).address,
                                'Proxy': logicProxy,
                                'implementationAddressStorage': getContractPerName(contractStorageName).address,
                                'StorageProxy': storageProxy,
                            };

                            contractNameToProxyAddress[contractName] = logicProxy;
                            contractNameToProxyAddress[contractStorageName] = storageProxy;

                            fileObject[contractName] = jsonObject;
                            resolve(logicProxy);
                        } catch (e) {
                            reject(e);
                        }
                    });
                }
                fs.writeFileSync(proxyFile, JSON.stringify(fileObject, null, 4));
                fs.writeFileSync(addressesFile, JSON.stringify(contractNameToProxyAddress, null, 4));
            })
            .then(() => deployer.deploy(TwoKeyEconomy,contractNameToProxyAddress["TwoKeyAdmin"], TwoKeySingletonesRegistry.address))
            .then(() => TwoKeyEconomy.deployed())
            .then(async () => {

                /**
                 * Here we will add congress contract to the registry
                 */
                await new Promise(async (resolve, reject) => {
                    try {

                        console.log('Adding non-upgradable contracts to the registry');
                        console.log('Adding TwoKeyCongress to the registry as non-upgradable contract');
                        let txHash = await TwoKeySingletonesRegistry.at(TwoKeySingletonesRegistry.address)
                            .addNonUpgradableContractToAddress('TwoKeyCongress', TwoKeyCongress.address);
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });

                /**
                 * Here we will add economy contract to the registry
                 */
                await new Promise(async (resolve, reject) => {
                    try {
                        console.log('Adding TwoKeyEconomy to the registry as non-upgradable contract');
                        let txHash = await TwoKeySingletonesRegistry.at(TwoKeySingletonesRegistry.address)
                            .addNonUpgradableContractToAddress('TwoKeyEconomy', TwoKeyEconomy.address);
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .then(() => true)
    } else if (deployer.network.startsWith('plasma') || deployer.network.startsWith('private')) {
        let proxyAddressTwoKeyPlasmaEvents;
        let proxyAddressTwoKeyPlasmaEventsSTORAGE;
        let proxyAddressTwoKeyPlasmaMaintainersRegistry;
        let proxyAddressTwoKeyPlasmaMaintainersRegistrySTORAGE;
        let proxyAddressTwoKeyPlasmaRegistry;
        let proxyAddressTwoKeyPlasmaRegistryStorage;

        const INITIAL_VERSION_OF_ALL_SINGLETONS = "1.0.0";

        deployer.link(Call, TwoKeyPlasmaEvents);
        deployer.link(Call, TwoKeyPlasmaRegistry);
        deployer.deploy(TwoKeyPlasmaEvents)
            .then(() => deployer.deploy(TwoKeyPlasmaMaintainersRegistry))
            .then(() => TwoKeyPlasmaMaintainersRegistry.deployed())
            .then(() => deployer.deploy(TwoKeyPlasmaRegistry))
            .then(() => TwoKeyPlasmaRegistry.deployed())
            .then(() => deployer.deploy(TwoKeyPlasmaSingletoneRegistry)) //adding empty admin address
            .then(() => TwoKeyPlasmaSingletoneRegistry.deployed().then(async (registry) => {
                await new Promise(async(resolve,reject) => {
                    try {
                        console.log('... Adding TwoKeyPlasmaEvents to Plasma Proxy registry as valid implementation');

                        let txHash = await registry.addVersion("TwoKeyPlasmaEvents", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaEvents.address);
                        txHash = await registry.addVersion("TwoKeyPlasmaEventsStorage", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaEventsStorage.address);
                        let { logs } = await registry.createProxy("TwoKeyPlasmaEvents", "TwoKeyPlasmaEventsStorage", INITIAL_VERSION_OF_ALL_SINGLETONS);

                        let { logicProxy , storageProxy} = logs.find(l => l.event === 'ProxiesDeployed').args;
                        const twoKeyPlasmaEvents = fileObject.TwoKeyPlasmaEvents || {};
                        twoKeyPlasmaEvents[network_id] = {
                            'implementationAddressLogic': TwoKeyPlasmaEvents.address,
                            'Proxy': logicProxy,
                            'implementationAddressStorage': TwoKeyPlasmaEventsStorage.address,
                            'StorageProxy': storageProxy,
                        };

                        proxyAddressTwoKeyPlasmaEvents = logicProxy;
                        proxyAddressTwoKeyPlasmaEventsSTORAGE = storageProxy;
                        fileObject['TwoKeyPlasmaEvents'] = twoKeyPlasmaEvents;

                        resolve(proxyAddressTwoKeyPlasmaEventsSTORAGE);
                    } catch (e) {
                        reject(e);
                    }
                });

                await new Promise(async(resolve,reject) => {
                    try {
                        console.log('... Adding TwoKeyPlasmaRegistry to Plasma Proxy registry as valid implementation');

                        let txHash = await registry.addVersion("TwoKeyPlasmaRegistry", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaRegistry.address);
                        txHash = await registry.addVersion("TwoKeyPlasmaRegistryStorage", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaRegistryStorage.address);
                        let { logs } = await registry.createProxy("TwoKeyPlasmaRegistry", "TwoKeyPlasmaRegistryStorage", INITIAL_VERSION_OF_ALL_SINGLETONS);

                        let { logicProxy , storageProxy} = logs.find(l => l.event === 'ProxiesDeployed').args;
                        const twoKeyPlasmaEventsReg = fileObject.TwoKeyPlasmaEventsRegistry || {};
                        twoKeyPlasmaEventsReg[network_id] = {
                            'implementationAddressLogic': TwoKeyPlasmaRegistry.address,
                            'Proxy': logicProxy,
                            'implementationAddressStorage': TwoKeyPlasmaRegistryStorage.address,
                            'StorageProxy': storageProxy,
                        };

                        proxyAddressTwoKeyPlasmaRegistry = logicProxy;
                        proxyAddressTwoKeyPlasmaRegistryStorage = storageProxy;
                        fileObject['TwoKeyPlasmaRegistry'] = twoKeyPlasmaEventsReg;

                        resolve(proxyAddressTwoKeyPlasmaEventsSTORAGE);
                    } catch (e) {
                        reject(e);
                    }
                });

                await new Promise(async(resolve,reject) => {
                    try {
                        console.log('... Adding TwoKeyPlasmaMaintainersRegistry');
                        let txHash = await registry.addVersion("TwoKeyPlasmaMaintainersRegistry", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaMaintainersRegistry.address);
                        txHash = await registry.addVersion("TwoKeyPlasmaMaintainersRegistryStorage", INITIAL_VERSION_OF_ALL_SINGLETONS, TwoKeyPlasmaMaintainersRegistryStorage.address);
                        let { logs } = await registry.createProxy("TwoKeyPlasmaMaintainersRegistry", "TwoKeyPlasmaMaintainersRegistryStorage", INITIAL_VERSION_OF_ALL_SINGLETONS);

                        let { logicProxy , storageProxy} = logs.find(l => l.event === 'ProxiesDeployed').args;
                        const twoKeyPlasmaMaintainersRegistry = fileObject.TwoKeyPlasmaMaintainersRegistry || {};
                        twoKeyPlasmaMaintainersRegistry[network_id] = {
                            'implementationAddressLogic': TwoKeyPlasmaMaintainersRegistry.address,
                            'Proxy': logicProxy,
                            'implementationAddressStorage': TwoKeyPlasmaMaintainersRegistryStorage.address,
                            'StorageProxy': storageProxy,
                        };

                        proxyAddressTwoKeyPlasmaMaintainersRegistry = logicProxy;
                        proxyAddressTwoKeyPlasmaMaintainersRegistrySTORAGE = storageProxy;
                        fileObject['TwoKeyPlasmaMaintainersRegistry'] = twoKeyPlasmaMaintainersRegistry;

                        fs.writeFileSync(proxyFile, JSON.stringify(fileObject, null, 4));
                        resolve(proxyAddressTwoKeyPlasmaMaintainersRegistrySTORAGE);
                    } catch (e) {
                        reject(e);
                    }
                })

            }))
            .then(async () => {
                await new Promise(async (resolve,reject) => {
                    try {
                        console.log('Setting initial params in plasma contract on plasma network');
                        let txHash = await TwoKeyPlasmaEvents.at(proxyAddressTwoKeyPlasmaEvents).setInitialParams
                        (
                            TwoKeyPlasmaSingletoneRegistry.address,
                            proxyAddressTwoKeyPlasmaEventsSTORAGE,
                        );
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });

                await new Promise(async (resolve,reject) => {
                    try {
                        console.log('Setting initial params in plasma registry contract on plasma network');
                        let txHash = await TwoKeyPlasmaRegistry.at(proxyAddressTwoKeyPlasmaRegistry).setInitialParams
                        (
                            TwoKeyPlasmaSingletoneRegistry.address,
                            proxyAddressTwoKeyPlasmaRegistryStorage
                        );
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });

                await new Promise(async (resolve,reject) => {
                    try {
                        console.log('Setting initial params in Maintainers contract on plasma network');
                        let txHash = await TwoKeyPlasmaMaintainersRegistry.at(proxyAddressTwoKeyPlasmaMaintainersRegistry).setInitialParams
                        (
                            TwoKeyPlasmaSingletoneRegistry.address,
                            proxyAddressTwoKeyPlasmaMaintainersRegistrySTORAGE,
                            maintainerAddresses
                        );
                        resolve(txHash);
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .then(() => true)
            .catch((err) => {
                console.log('\x1b[31m', 'Error:', err.message, '\x1b[0m');
            });
    }
};