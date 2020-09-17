import {exchangeRates} from "../../constants/smallConstants";

require('es6-promise').polyfill();
require('isomorphic-fetch');
require('isomorphic-form-data');

import {expect} from 'chai';
import 'mocha';
import web3Switcher from "../../helpers/web3Switcher";
import {TwoKeyProtocol} from "../../../src";
import getTwoKeyProtocol from "../../helpers/twoKeyProtocol";
import {promisify} from "../../../src/utils/promisify";

const {env} = process;

const timeout = 60000;
const usdSymbol = 'USD';
const usdDaiSymbol = 'USD-DAI';
const usd2KeySymbol = '2KEY-USD';
const tusdSymbol = 'TUSD-USD';
const daiSymbol = 'DAI-USD';


describe(
    'TwoKeyParticipationMiningRewards test',
    () => {
        let from: string;
        let twoKeyProtocol: TwoKeyProtocol;

        before(
            function () {
                this.timeout(timeout);

                const {web3, address} = web3Switcher.deployer();

                from = address;
                twoKeyProtocol = getTwoKeyProtocol(web3, env.MNEMONIC_BUYER);
            }
        );

        // Epoch id
        let epochId;
        // Pick 6 users to submit in the epoch
        let usersInEpoch;
        // Generate random rewards for the users
        let  userRewards;

        it('should register participation mining epoch', async () => {

            usersInEpoch = [
                "0xf3c7641096bc9dc50d94c572bb455e56efc85412",
                "0xebadf86c387fe3a4378738dba140da6ce014e974",
                "0xec8b6aaee825e0bbc812ca13e1b4f4b038154688",
                "0xfc279a3c3fa62b8c840abaa082cd6b4073e699c8",
                "0xc744f2ddbca85a82be8f36c159be548022281c62",
                "0x1b00334784ee0360ddf70dfd3a2c53ccf51e5b96"
            ];

            // Set user rewards
            userRewards = [
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
                parseFloat(twoKeyProtocol.Utils.toWei(Math.floor(Math.random() * 20)).toString()),
            ];


            epochId = parseInt(await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.getLatestEpochId,[]),10) + 1;
            let txHash = await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.registerParticipationMiningEpoch,
                [
                    epochId,
                    usersInEpoch,
                    userRewards,
                    {
                        from: twoKeyProtocol.plasmaAddress
                    }
                ]
            );

            await twoKeyProtocol.Utils.getTransactionReceiptMined(
                await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.finalizeEpoch,
                [
                    epochId,
                    {
                        from: twoKeyProtocol.plasmaAddress
                    }
                ]),
                {web3: twoKeyProtocol.plasmaWeb3}
            );

            let isEpochFinalized = await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.isEpochRegistrationFinalized,[epochId]);

            expect(isEpochFinalized).to.be.equal(true);
        }).timeout(timeout);

        it('should check that total submitted for epoch is equaling sum of all rewards', async() => {

            let totalRewardsForEpoch = userRewards.reduce((a,b) => a+b,0);
            let totalRewardsForEpochFromContract = await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.getTotalRewardsPerEpoch,[epochId]);

            expect(totalRewardsForEpoch).to.be.equal(parseFloat(totalRewardsForEpochFromContract));
        }).timeout(timeout);

        it('should check that user balances per this epoch are properly set', async() => {
            // Iterate through all users
            for(let i=0; i<usersInEpoch.length; i++) {
                // Get user earnings per epoch
                let userRewardsPerEpochFromContract = await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.getUserEarningsPerEpoch,[usersInEpoch[i],epochId]);
                // Expect to be same as the submitted value
                expect(parseFloat(userRewardsPerEpochFromContract)).to.be.equal(userRewards[i]);

                let userPendingEpochIds = await promisify(twoKeyProtocol.twoKeyPlasmaParticipationRewards.getPendingEpochsForUser,[usersInEpoch[i]]);
                // Convert big numbers to uint
                userPendingEpochIds = userPendingEpochIds.map((element) => {return parseInt(element,10)});
                // Expect that the last pending epoch id is the on submitted now.
                expect(userPendingEpochIds[userPendingEpochIds.length-1]).to.be.equal(epochId);
            }
        }).timeout(timeout);
    }
);