import { FC, useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { useTranslation, Trans } from 'react-i18next';
import Img, { Svg } from 'react-optimized-image';
import { ethers } from 'ethers';
import { useRecoilValue } from 'recoil';

import { appReadyState } from 'store/app';
import GasSelector from 'components/GasSelector';
import PendingConfirmation from 'assets/svg/app/pending-confirmation.svg';
import Success from 'assets/svg/app/success.svg';
import synthetix from 'lib/synthetix';
import Notify from 'containers/Notify';
import Etherscan from 'containers/Etherscan';
import { zIndex } from 'constants/ui';
import LockedIcon from 'assets/svg/app/locked.svg';
import Connector from 'containers/Connector';
import { EXTERNAL_LINKS } from 'constants/links';
import {
	ExternalLink,
	FlexDivColCentered,
	ModalContent,
	ModalItem,
	ModalItemTitle,
	ModalItemText,
} from 'styles/common';
import { getGasEstimateForTransaction } from 'utils/transactions';
import { Transaction } from 'constants/network';
import { normalizedGasPrice, normalizeGasLimit } from 'utils/network';
import { CurrencyKey, Synths } from 'constants/currency';
import TxConfirmationModal from 'sections/shared/modals/TxConfirmationModal';
import TxState from 'sections/earn/TxState';

import {
	Label,
	StyledLink,
	StyledButton,
	GreyHeader,
	WhiteSubheader,
	Divider,
	VerifyButton,
	DismissButton,
	ButtonSpacer,
	GreyText,
	LinkText,
} from '../../common';
import Color from 'color';
import { walletAddressState } from 'store/wallet';

export const getSettleSynthType = (stakedAsset: CurrencyKey) => {
	const { contracts, utils } = synthetix.js!;
	if (stakedAsset === Synths.iBTC) {
		return {
			contract: contracts.Exchanger,
			synth: utils.formatBytes32String(Synths.iBTC),
		};
	} else if (stakedAsset === Synths.iETH) {
		return {
			contract: contracts.Exchanger,
			synth: utils.formatBytes32String(Synths.iETH),
		};
	} else {
		throw new Error('unrecognizable asset');
	}
};

type SettleProps = {
	stakedAsset: CurrencyKey;
	setShowSettleOverlayModal: (show: boolean) => void;
};

const Settle: FC<SettleProps> = ({ stakedAsset, setShowSettleOverlayModal }) => {
	const { t } = useTranslation();
	const { monitorHash } = Notify.useContainer();
	const { provider } = Connector.useContainer();
	const { etherscanInstance } = Etherscan.useContainer();
	const walletAddress = useRecoilValue(walletAddressState);
	const [error, setError] = useState<string | null>(null);
	const [txModalOpen, setTxModalOpen] = useState<boolean>(false);
	const [gasLimitEstimate, setGasLimitEstimate] = useState<number | null>(null);
	const [gasPrice, setGasPrice] = useState<number>(0);
	const [transactionState, setTransactionState] = useState<Transaction>(Transaction.PRESUBMIT);
	const [txHash, setTxHash] = useState<string | null>(null);
	const link =
		etherscanInstance != null && txHash != null ? etherscanInstance.txLink(txHash) : undefined;
	const isAppReady = useRecoilValue(appReadyState);

	useEffect(() => {
		const getGasLimitEstimate = async () => {
			if (isAppReady) {
				try {
					setError(null);
					const { contract, synth } = getSettleSynthType(stakedAsset);
					let gasEstimate = await getGasEstimateForTransaction(
						[walletAddress, synth],
						contract.estimateGas.settle
					);
					setGasLimitEstimate(normalizeGasLimit(Number(gasEstimate)));
				} catch (error) {
					setError(error.message);
					setGasLimitEstimate(null);
				}
			}
		};
		getGasLimitEstimate();
	}, [stakedAsset, provider, isAppReady, walletAddress]);

	const handleSettle = useCallback(() => {
		async function approve() {
			if (isAppReady) {
				try {
					setError(null);
					setTxModalOpen(true);

					const { contract, synth } = getSettleSynthType(stakedAsset);

					const gasLimit = await getGasEstimateForTransaction(
						[walletAddress, synth],
						contract?.estimateGas.settle
					);
					const transaction: ethers.ContractTransaction = await contract.settle(
						walletAddress,
						synth,
						{
							gasPrice: normalizedGasPrice(gasPrice),
							gasLimit,
						}
					);

					if (transaction) {
						setTxHash(transaction.hash);
						setTransactionState(Transaction.WAITING);
						monitorHash({
							txHash: transaction.hash,
							onTxConfirmed: () => setTransactionState(Transaction.SUCCESS),
						});
						setTxModalOpen(false);
					}
				} catch (e) {
					setTransactionState(Transaction.PRESUBMIT);
					setError(e.message);
				}
			}
		}
		approve();
	}, [stakedAsset, gasPrice, monitorHash, isAppReady, walletAddress]);

	if (transactionState === Transaction.WAITING) {
		return (
			<TxState
				description={
					<Trans
						i18nKey="modals.settle.description"
						values={{
							stakedAsset,
						}}
						components={[<StyledLink href={EXTERNAL_LINKS.Synthetix.Incentives} />]}
					/>
				}
				title={t('earn.actions.settle.waiting')}
				content={
					<FlexDivColCentered>
						<Svg src={PendingConfirmation} />
						<GreyHeader>{t('earn.actions.settle.approving')}</GreyHeader>
						<WhiteSubheader>{t('earn.actions.settle.contract', { stakedAsset })}</WhiteSubheader>
						<Divider />
						<GreyText>{t('earn.actions.tx.notice')}</GreyText>
						<ExternalLink href={link}>
							<LinkText>{t('earn.actions.tx.link')}</LinkText>
						</ExternalLink>
					</FlexDivColCentered>
				}
			/>
		);
	}

	if (transactionState === Transaction.SUCCESS) {
		return (
			<TxState
				description={
					<Trans
						i18nKey="modals.settle.description"
						values={{
							stakedAsset,
						}}
						components={[<StyledLink href={EXTERNAL_LINKS.Synthetix.Incentives} />]}
					/>
				}
				title={t('earn.actions.settle.success')}
				content={
					<FlexDivColCentered>
						<Svg src={Success} />
						<GreyHeader>{t('earn.actions.settle.settling')}</GreyHeader>
						<WhiteSubheader>{t('earn.actions.settle.contract', { stakedAsset })}</WhiteSubheader>
						<Divider />
						<ButtonSpacer>
							{link ? (
								<ExternalLink href={link}>
									<VerifyButton>{t('earn.actions.tx.verify')}</VerifyButton>
								</ExternalLink>
							) : null}
							<DismissButton
								variant="secondary"
								onClick={() => {
									setTransactionState(Transaction.PRESUBMIT);
									setShowSettleOverlayModal(false);
								}}
							>
								{t('earn.actions.tx.dismiss')}
							</DismissButton>
						</ButtonSpacer>
					</FlexDivColCentered>
				}
			/>
		);
	}

	return (
		<>
			<OverlayContainer title="">
				<InnerContainer>
					<Img src={LockedIcon} />
					<Label>
						<Trans
							i18nKey="modals.settle.description"
							values={{
								stakedAsset,
							}}
							components={[<StyledLink href={EXTERNAL_LINKS.Synthetix.Incentives} />]}
						/>
					</Label>
					<PaddedButton variant="primary" onClick={handleSettle}>
						{t('modals.settle.button')}
					</PaddedButton>
					<GasSelector
						altVersion={true}
						gasLimitEstimate={gasLimitEstimate}
						setGasPrice={setGasPrice}
					/>
				</InnerContainer>
			</OverlayContainer>
			{txModalOpen && (
				<TxConfirmationModal
					onDismiss={() => setTxModalOpen(false)}
					txError={error}
					attemptRetry={handleSettle}
					content={
						<ModalContent>
							<ModalItem>
								<ModalItemTitle>{t('modals.confirm-transaction.settle.settling')}</ModalItemTitle>
								<ModalItemText>
									{t('modals.confirm-transaction.settle.contract', { stakedAsset })}
								</ModalItemText>
							</ModalItem>
						</ModalContent>
					}
				/>
			)}
		</>
	);
};

const OverlayContainer = styled(FlexDivColCentered)`
	z-index: ${zIndex.DIALOG_OVERLAY};
	justify-content: space-around;
	position: absolute;
	width: 575px;
	height: 390px;
	background: ${(props) => Color(props.theme.colors.black).alpha(0.9).rgb().string()};
`;

const InnerContainer = styled(FlexDivColCentered)`
	width: 300px;
`;

const PaddedButton = styled(StyledButton)`
	margin-top: 20px;
	width: 100%;
`;

export default Settle;
