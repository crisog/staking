import React, { useMemo } from 'react';

import { Svg } from 'react-optimized-image';
import StructuredTab from 'components/StructuredTab';
import Claim from 'assets/svg/app/claim.svg';
import { useTranslation } from 'react-i18next';
import ClaimTab from './components/ClaimTab';
import BigNumber from 'bignumber.js';

type ClaimBoxProps = {
	tradingRewards: BigNumber;
	stakingRewards: BigNumber;
	totalRewards: BigNumber;
};

const ClaimBox: React.FC<ClaimBoxProps> = ({ tradingRewards, stakingRewards, totalRewards }) => {
	const { t } = useTranslation();
	const tabData = useMemo(
		() => [
			{
				title: t('earn.actions.claim.title'),
				icon: () => <Svg src={Claim} />,
				tabChildren: (
					<ClaimTab
						stakingRewards={stakingRewards}
						tradingRewards={tradingRewards}
						totalRewards={totalRewards}
					/>
				),
			},
		],
		[t, stakingRewards, tradingRewards, totalRewards]
	);

	return (
		<StructuredTab
			boxPadding={0}
			boxHeight={400}
			boxWidth={500}
			tabData={tabData}
			setPanelType={() => {}}
		/>
	);
};

export default ClaimBox;
