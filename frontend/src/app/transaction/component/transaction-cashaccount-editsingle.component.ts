import {Component, Input, OnInit} from '@angular/core';
import {TransactionType} from '../../shared/types/transaction.type';
import {FieldConfig} from '../../dynamic-form/models/field.config';
import {Portfolio} from '../../entities/portfolio';
import {ProcessedActionData} from '../../shared/types/processed.action.data';
import {ProcessedAction} from '../../shared/types/processed.action';
import {ValidatorFn, Validators} from '@angular/forms';
import {TransactionService} from '../service/transaction.service';
import {TranslateService} from '@ngx-translate/core';
import {Cashaccount} from '../../entities/cashaccount';
import {gteWithMask, gteWithMaskIncludeNegative} from '../../shared/validator/validator';
import {Subscription} from 'rxjs';
import {Transaction} from '../../entities/transaction';
import {RuleEvent} from '../../dynamic-form/error/error.message.rules';
import {TransactionCashaccountBaseOperations} from './transaction.cashaccount.base.operations';
import {PortfolioService} from '../../portfolio/service/portfolio.service';
import {AppHelper} from '../../shared/helper/app.helper';
import {GlobalparameterService} from '../../shared/service/globalparameter.service';
import {FormConfig} from '../../dynamic-form/models/form.config';
import {InfoLevelType} from '../../shared/message/info.leve.type';
import {MessageToastService} from '../../shared/message/message.toast.service';
import {HelpIds} from '../../shared/help/help.ids';
import {FormDefinitionHelper} from '../../shared/edit/form.definition.helper';
import {DynamicFieldHelper} from '../../shared/helper/dynamic.field.helper';
import {BusinessHelper} from '../../shared/helper/business.helper';
import {SelectOptionsHelper} from '../../shared/helper/select.options.helper';
import {TranslateHelper} from '../../shared/helper/translate.helper';

/**
 * Used for cash account where only one cash account is involved.
 */
@Component({
  selector: 'transaction-cashaccount-editsingle',
  template: `
    <p-dialog header="{{'SINGLE_ACCOUNT_TRANSACTION' | translate}}"
              [(visible)]="visibleCashaccountTransactionSingleDialog"
              [responsive]="true" [style]="{width: '400px'}"
              (onShow)="onShow($event)" (onHide)="onHide($event)" [modal]="true">

      <dynamic-form [config]="config" [formConfig]="formConfig" [translateService]="translateService"
                    #form="dynamicForm"
                    (submit)="submit($event)">
      </dynamic-form>
    </p-dialog>
  `
})
export class TransactionCashaccountEditSingleComponent extends TransactionCashaccountBaseOperations implements OnInit {

  // InputMask from parent view
  @Input() visibleCashaccountTransactionSingleDialog: boolean;
  formConfig: FormConfig;

  readonly minAmount = 0.01;
  cashaccountCurrency = ' ';

  private transactionTypeChangedSub: Subscription;
  private chashaccountChangedSub: Subscription;
  private errorRequired = {name: 'required', keyi18n: 'required', rules: [RuleEvent.TOUCHED]};


  constructor(private portfolioService: PortfolioService,
              private transactionService: TransactionService,
              private messageToastService: MessageToastService,
              translateService: TranslateService,
              globalparameterService: GlobalparameterService) {
    super(translateService, globalparameterService);
  }


  ngOnInit(): void {
    this.formConfig = AppHelper.getDefaultFormConfig(this.globalparameterService,
      5, this.helpLink.bind(this));

    const calcGroupConfig: FieldConfig[] = [
      // Validator for amount is set dynamically
      DynamicFieldHelper.createFieldCurrencyNumberHeqF('cashaccountAmount', true, 10,
        2, true, {
          ...this.globalparameterService.getNumberCurrencyMask(),
          allowZero: false, allowNegative: true
        }),
      this.getTransactionCostFieldDefinition()
    ];

    this.config = [
      DynamicFieldHelper.createFieldSelectStringHeqF('transactionType', true),
      FormDefinitionHelper.getTransactionTime(),
      DynamicFieldHelper.createFieldSelectNumber('idCashaccount', 'ACCOUNT', true,
        {dataproperty: 'cashaccount.idSecuritycashAccount'}),
      DynamicFieldHelper.createFieldSelectNumber('idSecurityaccount', 'SECURITYACCOUNT', false,
        {invisible: true}),
      DynamicFieldHelper.createFieldCurrencyNumberHeqF('taxCost', false, 9,
        2, false, {
          ...this.globalparameterService.getNumberCurrencyMask(),
          allowNegative: false
        }, {invisible: true}),

      {formGroupName: 'calcGroup', fieldConfig: calcGroupConfig},
      this.getDebitAmountFieldDefinition(),
      DynamicFieldHelper.createFieldTextareaInputStringHeqF('note', 1000, false),
      DynamicFieldHelper.createSubmitButton()
    ];
    this.configObject = TranslateHelper.prepareFieldsAndErrors(this.translateService, this.config);
  }

  isVisibleDialog(): boolean {
    return this.visibleCashaccountTransactionSingleDialog;
  }

  selectSingleOptions(fieldConfig: FieldConfig, force: boolean) {
    if (fieldConfig.valueKeyHtmlOptions.length === 1 || force && fieldConfig.valueKeyHtmlOptions.length > 0) {
      fieldConfig.formControl.setValue(fieldConfig.valueKeyHtmlOptions[0].key);
    }
  }

  /**
   * Depending on the transaction type a validator will be set an some input fields set visible or invisible
   */
  valueChangedOnTransactionType() {
    this.transactionTypeChangedSub = this.configObject.transactionType.formControl.valueChanges.subscribe((data: string) => {
        switch (TransactionType[data]) {
          case TransactionType.FEE:
            this.configObject.idSecurityaccount.invisible = false;
            if (this.configObject.idCashaccount.formControl.value) {
              const cp: { cashaccount: Cashaccount, portfolio: Portfolio } = this.getCashaccountByIdCashaccountFromPortfolios(
                this.portfolios, +this.configObject.idCashaccount.formControl.value);
              this.prepareSecurityaccount(cp.portfolio);
            }
            this.setAmountValidator(true, gteWithMaskIncludeNegative(this.minAmount), 'gteWithMaskIncludeNegative');
            this.configObject.taxCost.invisible = true;
            break;
          case TransactionType.INTEREST_CASHACCOUNT:
            this.setAmountValidator(true, gteWithMaskIncludeNegative(this.minAmount), 'gteWithMaskIncludeNegative');
            this.configObject.taxCost.invisible = false;
            break;
          default:
            // Deposit and withdrawal
            this.configObject.idSecurityaccount.invisible = true;
            this.configObject.taxCost.invisible = true;
            this.setAmountValidator(false, gteWithMask(this.minAmount), 'gte');
        }

        this.configObject.cashaccountAmount.labelKey = this.configObject.transactionType.valueKeyHtmlOptions
          .find(vkho => vkho.key === data).value;
        const invisibleWithdrawal = TransactionType[data] !== TransactionType.WITHDRAWAL;
        this.configObject.debitAmount.invisible = invisibleWithdrawal;
        this.configObject.transactionCost.invisible = invisibleWithdrawal;

      }
    );
  }

  /**
   * Change observer on cash account is needed for the currency determination
   */
  valueChangedOnCashaccount(): void {
    this.chashaccountChangedSub = this.configObject.idCashaccount.formControl.valueChanges.subscribe((data: string) => {
      const cp: { cashaccount: Cashaccount, portfolio: Portfolio } = this.getCashaccountByIdCashaccountFromPortfolios(
        this.portfolios, +data);
      this.prepareSecurityaccount(cp.portfolio);
      this.cashaccountCurrency = cp.cashaccount.currency;
      this.configObject.cashaccountAmount.currencyMaskConfig.prefix = AppHelper.addSpaceToCurrency(this.cashaccountCurrency);
      this.configObject.debitAmount.currencyMaskConfig.prefix = AppHelper.addSpaceToCurrency(this.cashaccountCurrency);
      this.configObject.taxCost.currencyMaskConfig.prefix = AppHelper.addSpaceToCurrency(this.cashaccountCurrency);
    });
  }

  valueChangedOnCalcFields(): void {
    this.valueChangedOnValueCalcFieldsSub = this.configObject.calcGroup.formControl.valueChanges.subscribe(data => {
      this.setCalculatedDebitAmount();
    });
  }

  private setCalculatedDebitAmount(): void {
    if (!this.configObject.transactionCost.invisible) {
      const values: any = {};
      this.form.cleanMaskAndTransferValuesToBusinessObject(values, true);
      this.configObject.debitAmount.formControl.setValue((values.cashaccountAmount + (values.transactionCost
        ? values.transactionCost : 0)));
    }
  }


  onHide(event) {
    this.transactionTypeChangedSub && this.transactionTypeChangedSub.unsubscribe();
    this.chashaccountChangedSub && this.chashaccountChangedSub.unsubscribe();
    super.close();

  }

  submit(value: { [name: string]: any }) {
    const transaction: Transaction = new Transaction();
    if (this.transactionCallParam.transaction) {
      Object.assign(transaction, this.transactionCallParam.transaction);
    }
    this.form.cleanMaskAndTransferValuesToBusinessObject(transaction);
    transaction.cashaccount = this.getCashaccountByIdCashaccountFromPortfolios(this.portfolios,
      transaction.idCashaccount).cashaccount;

    if (TransactionType[transaction.transactionType] === TransactionType.WITHDRAWAL) {
      transaction.cashaccountAmount = transaction.cashaccountAmount + transaction.transactionCost;
    }

    this.transactionService.updateCreateSingleCashTrans(transaction).subscribe(newTransaction => {
      this.messageToastService.showMessageI18n(InfoLevelType.SUCCESS, 'MSG_RECORD_SAVED', {i18nRecord: 'TRANSACTION'});
      this.closeDialog.emit(new ProcessedActionData(transaction.idTransaction ? ProcessedAction.UPDATED
        : ProcessedAction.CREATED, newTransaction));
    }, () => this.configObject.submit.disabled = false);

  }

  helpLink() {
    BusinessHelper.toExternalHelpWebpage(this.globalparameterService.getUserLang(), HelpIds.HELP_TRANSACTION_ACCOUNT);
  }

  protected initialize(): void {

    this.valueChangedOnCashaccount();
    this.valueChangedOnTransactionType();
    this.valueChangedOnCalcFields();

    this.configObject.transactionType.valueKeyHtmlOptions = SelectOptionsHelper.createHtmlOptionsFromEnum(this.translateService,
      TransactionType, [TransactionType.DEPOSIT, TransactionType.INTEREST_CASHACCOUNT,
        TransactionType.WITHDRAWAL, TransactionType.FEE]);

    this.selectSingleOptions(this.configObject.transactionType, true);

    if (this.transactionCallParam.portfolio) {
      this.getSinglePortfolioByIdPortfolio();
    } else {
      this.getAllPortfolios();
    }
  }

  private getSinglePortfolioByIdPortfolio(): void {
    // Portfolio maybe out of date
    this.portfolioService.getPortfolioByIdPortfolio(this.transactionCallParam.portfolio.idPortfolio).subscribe((portfolio: Portfolio) => {
        // this.transactionCallParam.portfolio = portfolio;
        this.portfolios = [portfolio];
        this.configObject.idCashaccount.valueKeyHtmlOptions = this.prepareCashaccountOptions(this.portfolios);
        this.setExistingTransactionToView();
      }
    );
  }

  private getAllPortfolios(): void {
    this.portfolioService.getPortfoliosForTenantOrderByName()
      .subscribe((data: Portfolio[]) => {
        this.portfolios = data;
        this.configObject.idCashaccount.valueKeyHtmlOptions = this.prepareCashaccountOptions(this.portfolios);
        this.setExistingTransactionToView();
      });
  }

  private setExistingTransactionToView(): void {
    if (this.transactionCallParam.transaction === null) {
      this.configObject.idCashaccount.formControl.setValue(this.transactionCallParam.cashaccount.idSecuritycashAccount);
    } else {
      this.form.transferBusinessObjectToForm(this.transactionCallParam.transaction);
      this.configObject.cashaccountAmount.formControl.setValue(BusinessHelper.getTotalAmountFromTransaction(
        this.transactionCallParam.transaction) - (this.transactionCallParam.transaction.transactionCost === null ? 0
        : this.transactionCallParam.transaction.transactionCost));
    }
  }

  private setAmountValidator(allowNegativ: boolean, validator: ValidatorFn, validatorKey: string) {
    this.configObject.cashaccountAmount.currencyMaskConfig.allowNegative = allowNegativ;
    this.configObject.cashaccountAmount.validation = [Validators.required, validator];
    this.configObject.cashaccountAmount.formControl.setValidators(this.configObject.cashaccountAmount.validation);
    this.configObject.cashaccountAmount.errors = [this.errorRequired,
      {name: validatorKey, keyi18n: validatorKey, param1: this.minAmount, rules: ['dirty']}];
    TranslateHelper.translateMessageError(this.translateService, this.configObject.cashaccountAmount);
    this.configObject.cashaccountAmount.formControl.updateValueAndValidity();
    this.configObject.cashaccountAmount.baseInputComponent.reEvaluateRequired();
  }

  private prepareSecurityaccount(portfolio: Portfolio) {
    if (!this.configObject.idSecurityaccount.invisible) {
      this.configObject.idSecurityaccount.valueKeyHtmlOptions =
        SelectOptionsHelper.createValueKeyHtmlSelectOptions('idSecuritycashAccount', 'name',
          portfolio.securityaccountList, true);
      this.selectSingleOptions(this.configObject.idSecurityaccount, true);
    }

  }
}