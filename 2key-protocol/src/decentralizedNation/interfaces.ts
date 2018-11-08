import {ICreateOpts} from '../interfaces';
import {IJoinLinkOpts} from "../acquisition/interfaces";

export interface IDecentralizedNation {
    create: (data: IDecentralizedNationConstructor, from: string, opts?: ICreateOpts) => Promise<string>,
    populateData: (username:string, address:string, fullName:string, email:string, from: string) => Promise<string>
    check: (address: string, from:string) => Promise<boolean>,
    getAllMembersFromDAO: (decentralizedNation:any) => Promise<IMember[]>,
    getAllMembersForSpecificType: (decentralizedNation:any, type:string, from:string) => Promise<any>,
    getVotingPointsForTheMember: (decentralizedNation: any, address: string, from: string) => Promise<number>,
    addMemberByFounder: (decentralizedNation: any, newMemberAddress: string, memberType:string, from:string) => Promise<string>,
    getNameAndIpfsHashesForDAO: (decentralizedNation: any) => Promise<IDaoMeta>,
    createCampaign: (decentralizedNation: any, data: INationalVotingCampaign, from: string,  opts?: ICreateOpts) => Promise<any>,
    isTypeEligibleToCreateAVotingCampaign: (decentralizedNation: any, memberType: string) => Promise<boolean>,
    getAllCampaigns: (decentralizedNation:any) => Promise<IVotingCampaign[]>,
    join: (campaign: any, from: string, opts?: IJoinLinkOpts) => Promise<string>,
    countPlasmaVotes: (weightedVoteContract: any, contractor: string) => Promise<boolean>,
    getVotingResults: (weightedVoteContract: any) => Promise<any>,
}

export interface IMember {
    address: string,
    username: string,
    fullname: string,
    email: string,
    type: string,
}

export interface IDaoMeta {
    name: string,
    constitution: string,
    meta: any,
}


export interface INationalVotingCampaign {
    votingReason: string, //Just some text
    campaignLengthInDays: number,
    flag: number,
}

export interface IVotingCampaign {
    votingReason: string,
    finished: boolean,
    votesYes: number,
    votesNo: number,
    votingResultForYes: number,
    votingResultForNo: number,
    votingCampaignLengthInDays: Date,
    campaignType: string,
    votingCampaignContractAddress: string,
}

export interface IDecentralizedNationConstructor {
    nationName: string,
    ipfsHashForConstitution: string,
    ipfsHashForDAOPublicInfo: string,
    initialMemberAddresses: string[],
    initialMemberTypes: string[],
    limitsPerMemberType: number[],
    eligibleToStartVotingCampaign: number[],
    minimalNumberOfVotersForVotingCampaign: number,
    minimalPercentOfVotersForVotingCampaign: number,
    minimalNumberOfVotersForPetitioningCampaign: number,
    minimalPercentOfVotersForPetitioningCampaign: number,
}

