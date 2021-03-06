# Constants
UINT_SIZE = 64
ADDRESS_SIZE = 40
BOOL_SIZE = 2

class Conversion(object):
    contractor = "0x"
    contractorProceedsETHWei = 0
    converter = "0x"
    state = 0
    conversionAmount = 0
    maxReferralRewardEthWei = 0
    maxReferralRewardTwoKey = 0
    moderatorFeeETHWei = 0
    baseTokenUnits = 0
    bonusTokenUnits = 0
    conversionCreatedAt = 0
    conversionExpiresAt = 0
    isConversionFiat = 0
    lockupAddress = "0x"

    # The class "constructor" - It's actually an initializer
    def __init__(self, contractor, contractorProceedsETHWei, converter, state, conversionAmount,
                maxReferralRewardEthWei, maxReferralRewardTwoKey, moderatorFeeETHWei, baseTokenUnits,
                bonusTokenUnits, conversionCreatedAt, conversionExpiresAt, isConversionFiat, lockupAddress):
        self.contractor = contractor #address
        self.contractorProceedsETHWei = contractorProceedsETHWei #uint256
        self.converter = converter #address
        self.state = state #bool
        self.conversionAmount = conversionAmount #uint256
        self.maxReferralRewardEthWei = maxReferralRewardEthWei #uint256
        self.maxReferralRewardTwoKey = maxReferralRewardTwoKey #uint256
        self.moderatorFeeETHWei = moderatorFeeETHWei #uint256
        self.baseTokenUnits = baseTokenUnits #uint256
        self.bonusTokenUnits = bonusTokenUnits #uint256
        self.conversionCreatedAt = conversionCreatedAt #uint256
        self.conversionExpiresAt = conversionExpiresAt #uint256
        self.isConversionFiat = isConversionFiat #bool
        self.lockupAddress = lockupAddress #address

    def __str__(self):
        return str(self.__class__) + ": " + str(self.__dict__)


# Helper functions
def fromWei(value):
    if(value == 0):
        return 0
    return value/(10**18)

def str_to_bool(value):
    value = int(value)
    if(value == 0):
        return False
    return True


# Function to decode input
def decode(conversion):
    values = []
    types =  ['address','uint','address','bool','uint','uint','uint','uint','uint','uint','uint','uint','bool','address']

    leading_zero = '0x'
    additional = 2
    index = 0
    for i in range(0,len(types)):
        if(i != 0):
            additional = 0
        if(types[i] == 'address'):
            prefix = ''
            if(additional == 0):
                prefix = '0x'
            values.append(prefix + conversion[index:index+ADDRESS_SIZE+additional])
            index = index + ADDRESS_SIZE + additional
        elif(types[i] == 'uint'):
            values.append(int(conversion[index:index+UINT_SIZE+additional],16))
            index = index + UINT_SIZE + additional
        elif(types[i] == 'bool'):
            values.append(conversion[index:index+BOOL_SIZE+additional])
            index = index + BOOL_SIZE + additional

    c = Conversion(values[0], fromWei(values[1]), values[2], values[3], fromWei(values[4]), fromWei(values[5]), fromWei(values[6]), fromWei(values[7]), fromWei(values[8]), fromWei(values[9]), values[10], values[11], str_to_bool(values[12]),values[13])
    return c

conversion = '0x2230ed1a134737d305c0c962f0e75571cc02f5850000000000000000000000000000000000000000000000000519e4abc5035b400f8b4cf76e8f3f8e796ecf215badddd3bcd41d37020000000000000000000000000000000000000000000000000519e4abc5035b4000000000000000000000000000000000000000000000000001052dbbf433df0c0000000000000000000000000000000000000000000000000abd3fba7657e4e00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000001fe1d5318f54fa5000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000005cb5d3de00000000000000000000000000000000000000000000000000000048c82393de0113a809d257e0e4a569b4c8658967681f7ab73ab1'
print(decode(conversion))

