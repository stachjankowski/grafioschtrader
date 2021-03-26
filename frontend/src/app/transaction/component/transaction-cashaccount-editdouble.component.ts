import {Component, Input, OnInit, ViewChild} from '@angular/core';
import {FieldConfig} from '../../dynamic-form/models/field.config';
import {TranslateService} from '@ngx-translate/core';
import {CashAccountTransfer, TransactionService} from '../service/transaction.service';
import {DynamicFormComponent} from '../../dynamic-form/containers/dynamic-form/dynamic-form.component';
import {TransactionCallParam} from './transaction.call.parm';
import {ProcessedActionData} from '../../shared/types/processed.action.data';
import {ProcessedAction} from '../../shared/types/processed.action';
import {TransactionCashaccountBaseOperations} from './transaction.cashaccount.base.operations';
import {GlobalparameterService} from '../../shared/service/globalparameter.service';
import {Portfolio} from '../../entities/portfolio';
import {PortfolioService} from '../../portfolio/service/portfolio.service';
import {ValueKeyHtmlSelectOptions} from '../../dynamic-form/models/value.key.html.select.options';
import {Subscription} from 'rxjs';
import {Cashaccount} from '../../entities/cashaccount';
import {Transaction} from '../../entities/transaction';
import {TransactionType} from '../../shared/types/transaction.type';
import {AppHelper} from '../../shared/helper/app.helper';
import {Currencypair} from '../../entities/currencypair';
import {Helper} from '../../helper/helper';
import {CurrencypairService} from '../../securitycurrency/service/currencypair.service';
import {InfoLevelType} from '../../shared/message/info.leve.type';
import {MessageToastService} from '../../shared/message/message.toast.service';
import {FormConfig} from '../../dynamic-form/models/form.config';
import {HistoryquoteService} from '../../historyquote/service/historyquote.service';
import {HelpIds} from '../../shared/help/help.ids';
import {FormDefinitionHelper} from '../../shared/edit/form.definition.helper';
import {DynamicFieldHelper, VALIDATION_SPECIAL} from '../../shared/helper/dynamic.field.helper';
import {BusinessHelper} from '../../shared/helper/business.helper';
import {TranslateHelper} from '../../shared/helper/translate.helper';
import {AppSettings} from '../../shared/app.settings';

/**
 * Cash transfer between two cash accounts which are managed by this application.
 */
@Component({
  selector: 'transaction-cashaccount-editdouble',
  template: `
    <p-dialog header="{{'ACCOUNT_TRANSFER' | translate}}" [(visible)]="visibleCashaccountTransactionDoubleDialog"
              [responsive]="true" [style]="{width: '550px'}"
              (onShow)="onShow($event)" (onHide)="onHide($event)" [modal]="true">

      <dynamic-form [config]="config" [formConfig]="formConfig" [translateService]="translateService"
                    #form="dynamicForm"
                    (submit)="submit($event)">
      </dynamic-form>
    </p-dialog>
  `,


})
export class TransactionCashaccountEditDoubleComponent extends TransactionCashaccountBaseOperations implements OnInit {

  // InputMask from parent view
  @Input() visibleCashaccountTransactionDoubleDialog: boolean;
  @Input() transactionCallParam: TransactionCallParam;

  // Access the form
  @ViewChild(DynamicFormComponent) form: DynamicFormComponent;


  formConfig: FormConfig;

  // The first is the withdrawal(debit) and the 2nd is the deposit(credit)
  transactions: Transaction[] = [];

  readonly WithIndex: number = 0;
  readonly DepIndex: number = 1;

  debitCashaccount: Cashaccount;
  creditCashaccount: Cashaccount;
  currencypair: Currencypair;


  // Obeserver subscribe
  private transactionTimeChangeSub: Subscription;
  private debitChashaccountChangedSub: Subscription;
  private creditChashaccountChangedSub: Subscription;


  constructor(private historyquoteService: HistoryquoteService,
              private portfolioService: PortfolioService,
              private currencypairService: CurrencypairService,
              private transactionService: TransactionService,
              private messageToastService: MessageToastService,
              translateService: TranslateService, globalparameterService: GlobalparameterService) {
    super(translateService, globalparameterService);
  }


  ngOnInit(): void {

    this.formConfig = AppHelper.getDefaultFormConfig(this.globalparameterService,
      4, this.helpLink.bind(this));


    // When the input on the following group changes, some calculations must be executed
    const calcGroupConfig: FieldConfig[] = [
      DynamicFieldHelper.createFieldCurrencyNumberVSParam('currencyExRate', 'EXCHANGE_RATE',
        true, 7, 8, false,
        this.globalparameterService.getNumberCurrencyMask(), VALIDATION_SPECIAL.GT_With_Mask_Param, 0.00001, {usedLayoutColumns: 8}),


      DynamicFieldHelper.createFunctionButtonFieldName('oneOverX', '1/x',
        (e) => this.oneOverX(e), {
          buttonInForm: true, usedLayoutColumns: 1,
        }),

      DynamicFieldHelper.createFunctionButtonFieldName('exRateButton', 'TIME_DEPENDING_EXCHANGE_RATE_',
        (e) => this.getTimeDependingExchangeRate(e), {icon: AppSettings.PATH_ASSET_ICONS + 'refresh.svg',
          buttonInForm: true, usedLayoutColumns: 1}),

      DynamicFieldHelper.createFieldCurrencyNumberVSParamHeqF('creditAmount', true, 11,
        2, false, {
          ...this.globalparameterService.getNumberCurrencyMask(),
          allowZero: false
        }, VALIDATION_SPECIAL.GT_With_Mask_Param, 0.01),

      this.getTransactionCostFieldDefinition(),
    ];

    this.config = [
      FormDefinitionHelper.getTransactionTime(),
      DynamicFieldHelper.createFieldSelectNumber('idDebitCashaccount', 'DEBIT_ACCOUNT', true),
      DynamicFieldHelper.createFieldSelectNumber('idCreditCashaccount', 'CREDIT_ACCOUNT', true),
      {formGroupName: 'calcGroup', fieldConfig: calcGroupConfig},
      this.getDebitAmountFieldDefinition(),
      DynamicFieldHelper.createFieldTextareaInputStringHeqF('note', 1000, false),
      DynamicFieldHelper.createSubmitButton()
    ];
    this.configObject = TranslateHelper.prepareFieldsAndErrors(this.translateService, this.config);
  }

  isVisibleDialog(): boolean {
    return this.visibleCashaccountTransactionDoubleDialog;
  }

  ////////////////////////////////////////////////
  onHide(event): void {
    this.debitChashaccountChangedSub && this.debitChashaccountChangedSub.unsubscribe();
    this.creditChashaccountChangedSub && this.creditChashaccountChangedSub.unsubscribe();
    this.transactionTimeChangeSub && this.transactionTimeChangeSub.unsubscribe();
    super.close();

  }

  valueChangedOnCalcFields(): void {
    this.valueChangedOnValueCalcFieldsSub = this.configObject.calcGroup.formControl.valueChanges.subscribe(data => {
      this.setCalculatedDebitAmount();
    });
  }

  setCalculatedDebitAmount(): void {
    const values: any = {};
    this.form.cleanMaskAndTransferValuesToBusinessObject(values, true);

    if (this.currencypair) {
      const debitAmount = this.calcDebitAmount(values);
      this.configObject.debitAmount.formControl.setValue(debitAmount);

    } else {
      this.configObject.debitAmount.formControl.setValue(values.creditAmount + (values.transactionCost
        ? values.transactionCost : 0));
    }
  }


  calcDebitAmount(values: any): number {
    return BusinessHelper.divideMultiplyExchangeRate(values.creditAmount, values.currencyExRate,
      this.debitCashaccount.currency, this.currencypair) + ((values.transactionCost) ? values.transactionCost : 0);
  }

  getTimeDependingExchangeRate(event): void {
    const transactionTime: number = +this.configObject.transactionTime.formControl.value;
    BusinessHelper.setHistoryquoteCloseToFormControl(this.messageToastService, this.historyquoteService,
      this.globalparameterService,
      transactionTime, this.currencypair.idSecuritycurrency, false, this.configObject.currencyExRate.formControl);
  }

  private getCurrencypair() {
    this.currencypairService.findOrCreateCurrencypairByFromAndToCurrency(this.currencypair.fromCurrency,
      this.currencypair.toCurrency).subscribe(currencypair => {
      this.currencypair = currencypair;
      if (this.hasChangedOnExistingTransaction()) {
        BusinessHelper.getAndSetQuoationCurrencypair(this.currencypairService, this.currencypair,
          +this.configObject.transactionTime.formControl.value, this.configObject.currencyExRate.formControl);
      }
    });
  }

  oneOverX(event): void {
    this.configObject.currencyExRate.formControl.setValue(1 / this.configObject.currencyExRate.formControl.value);
  }

  valueChangedOnTransactionTime() {
    this.transactionTimeChangeSub = this.configObject.transactionTime.formControl.valueChanges.subscribe(() =>
      this.disableEnableExchangeRateButton());
  }

  valueChangedOnDebitCashaccount(): void {
    this.debitChashaccountChangedSub = this.configObject.idDebitCashaccount.formControl.valueChanges.subscribe((data: string) => {
      if (Helper.hasValue(data)) {
        const cp: { cashaccount: Cashaccount, portfolio: Portfolio } = this.getCashaccountByIdCashaccountFromPortfolios(
          this.portfolios, +data);
        this.debitCashaccount = cp.cashaccount;
        this.filterCreditHtmlOptions(this.configObject.idDebitCashaccount.valueKeyHtmlOptions,
          cp.cashaccount.idSecuritycashAccount);
        this.configObject.debitAmount.currencyMaskConfig.prefix = AppHelper.addSpaceToCurrency(this.debitCashaccount.currency);
        this.changeCurrencyExRateState();
      }
    });
  }

  /**
   * When cash credit account changes the currency of the must be changed as well
   */
  valueChangedOnCreditCashaccount(): void {
    this.creditChashaccountChangedSub = this.configObject.idCreditCashaccount.formControl.valueChanges.subscribe((data: string) => {
      if (data) {
        const cp: { cashaccount: Cashaccount, portfolio: Portfolio } = this.getCashaccountByIdCashaccountFromPortfolios(
          this.portfolios, +data);
        this.creditCashaccount = cp.cashaccount;
        this.configObject.creditAmount.currencyMaskConfig.prefix = AppHelper.addSpaceToCurrency(this.creditCashaccount.currency);
        this.changeCurrencyExRateState();
      }
    });
  }

  helpLink() {
    BusinessHelper.toExternalHelpWebpage(this.globalparameterService.getUserLang(), HelpIds.HELP_TRANSACTION_ACCOUNT);
  }

  protected initialize(): void {
    this.valueChangedOnTransactionTime();
    this.portfolioService.getPortfoliosForTenantOrderByName()
      .subscribe((data: Portfolio[]) => {
        this.portfolios = data;
        this.diableCurrencyExRateState();

        if (this.transactionCallParam.transaction) {
          this.setupModifyExistingTransaction(this.transactionCallParam.transaction);
        } else {
          this.setupCashaccountSelect(this.transactionCallParam.cashaccount.idSecuritycashAccount, null);
        }
      });
  }

  private setupCashaccountSelect(debitIdCashaccount: number, creditIdCashaccount: number) {
    this.configObject.idDebitCashaccount.valueKeyHtmlOptions = this.prepareCashaccountOptions(this.portfolios);
    this.filterCreditHtmlOptions(this.configObject.idDebitCashaccount.valueKeyHtmlOptions,
      creditIdCashaccount);
    this.valueChangedOnDebitCashaccount();
    this.valueChangedOnCreditCashaccount();
    // Debit account is always set
    this.configObject.idDebitCashaccount.formControl.setValue(debitIdCashaccount);
    if (creditIdCashaccount) {
      this.configObject.idCreditCashaccount.formControl.setValue(creditIdCashaccount);
    }
    this.valueChangedOnCalcFields();
  }


  private setupModifyExistingTransaction(transaction1: Transaction) {
    this.transactionService.getTransactionByIdTransaction(transaction1.connectedIdTransaction).subscribe(data => {
      this.transactions = [];
      this.transactions.push(transaction1);
      if (TransactionType[data.transactionType] === TransactionType.WITHDRAWAL) {
        this.transactions.unshift(data);
      } else {
        this.transactions.push(data);
      }
      this.setFormValues();
    });
  }

  private setFormValues(): void {
    this.configObject.transactionTime.formControl.setValue(new Date(this.transactions[this.WithIndex].transactionTime));
    this.configObject.currencyExRate.formControl.setValue(this.transactions[this.WithIndex].currencyExRate);
    this.configObject.transactionCost.formControl.setValue(this.transactions[this.WithIndex].transactionCost);
    this.configObject.creditAmount.formControl.setValue(this.transactions[this.DepIndex].cashaccountAmount);
    this.configObject.note.formControl.setValue(this.transactions[this.WithIndex].note);

    this.setupCashaccountSelect(this.transactions[this.WithIndex].cashaccount.idSecuritycashAccount,
      this.transactions[this.DepIndex].cashaccount.idSecuritycashAccount);
    this.setCalculatedDebitAmount();
  }


  /**
   * Enable or disable input for currency exchange rate.
   */
  private changeCurrencyExRateState(): void {
    if (this.debitCashaccount && this.creditCashaccount) {
      this.setCurrencypair();
      if (this.debitCashaccount.currency === this.creditCashaccount.currency) {
        this.configObject.currencyExRate.formControl.setValue(1);
        this.diableCurrencyExRateState();
      } else {
        this.configObject.currencyExRate.labelSuffix = this.currencypair.toStringFN();
        this.configObject.currencyExRate.formControl.enable();
        this.getCurrencypair();
      }
    }
    this.disableEnableExchangeRateButton();
  }

  private setCurrencypair(): void {
    if (this.transactionCallParam.transaction
      && this.transactions[this.DepIndex].cashaccount.currency === this.debitCashaccount.currency
      && this.transactions[this.WithIndex].cashaccount.currency === this.creditCashaccount.currency) {
      this.currencypair = this.transactionCallParam.transaction.currencypair;
    } else {
      this.currencypair = BusinessHelper.getCurrencypairWithSetOfFromAndTo(this.creditCashaccount.currency,
        this.debitCashaccount.currency);
    }
  }


  private disableEnableExchangeRateButton() {
    this.configObject.exRateButton.disabled = this.configObject.currencyExRate.formControl.disabled ||
      !this.configObject.transactionTime.formControl.valid;
    this.configObject.oneOverX.disabled = this.configObject.currencyExRate.formControl.disabled;

  }

  /**
   * Return true when exchange rate can be adjusted
   */
  private hasChangedOnExistingTransaction(): boolean {
    const t = this.transactionCallParam.transaction;
    return t === null || t !== null &&
      (this.configObject.idCreditCashaccount.formControl.value &&
        this.transactions[this.DepIndex].cashaccount.idSecuritycashAccount !== this.configObject.idCreditCashaccount.formControl.value
        || this.transactions[this.WithIndex].cashaccount.idSecuritycashAccount &&
        this.transactions[this.WithIndex].cashaccount.idSecuritycashAccount !== this.configObject.idDebitCashaccount.formControl.value);
  }

  private diableCurrencyExRateState(): void {
    this.configObject.currencyExRate.labelSuffix = '';
    this.configObject.currencyExRate.formControl.disable();
  }

  private filterCreditHtmlOptions(debitHtmlOptions: ValueKeyHtmlSelectOptions[], idCashaccountCredit: number): void {
    const valueKeyHtmlOptions = debitHtmlOptions.filter(debitHtmlOption =>
      debitHtmlOption.key !== idCashaccountCredit);

    this.configObject.idCreditCashaccount.valueKeyHtmlOptions = valueKeyHtmlOptions;
    this.configObject.idCreditCashaccount.valueKeyHtmlOptions.unshift(new ValueKeyHtmlSelectOptions('', ''));
    if (valueKeyHtmlOptions.length === 2) {
      this.configObject.idCreditCashaccount.formControl.setValue(valueKeyHtmlOptions[1].key);
    } else {
      this.configObject.idCreditCashaccount.formControl.setValue('');
    }
  }

  private createOrCopyExistingTransaction(): CashAccountTransfer {
    const newTransactions: Transaction[] = [];
    for (let i = 0; i < 2; i++) {
      newTransactions.push(new Transaction());
      if (this.transactionCallParam.transaction) {
        Object.assign(newTransactions[i], this.transactions[i]);
      } else {
        newTransactions[i].transactionType = TransactionType[(i === this.WithIndex)
          ? TransactionType.WITHDRAWAL : TransactionType.DEPOSIT];
      }
      this.form.cleanMaskAndTransferValuesToBusinessObject(newTransactions[i]);
    }
    return new CashAccountTransfer(newTransactions[0], newTransactions[1]);
  }

  submit(value: { [name: string]: any }) {
    let cashAccountTransfer: CashAccountTransfer = this.createOrCopyExistingTransaction();
    cashAccountTransfer = this.viewToBusinessModel(cashAccountTransfer);
    this.saveTransaction(cashAccountTransfer);
  }

  saveTransaction(cashAccountTransfer: CashAccountTransfer) {
    this.transactionService.updateCreateDoubleTransaction(cashAccountTransfer).subscribe((newCashAccountTransfer: CashAccountTransfer) => {
        this.messageToastService.showMessageI18n(InfoLevelType.SUCCESS, 'MSG_RECORD_SAVED', {i18nRecord: 'TRANSACTION'});
        this.closeDialog.emit(new ProcessedActionData(cashAccountTransfer.depositTransaction.idTransaction ? ProcessedAction.UPDATED
          : ProcessedAction.CREATED, [newCashAccountTransfer.withdrawalTransaction, newCashAccountTransfer.depositTransaction]));
      }, () => this.configObject.submit.disabled = false
    );
  }

  private viewToBusinessModel(cashAccountTransfer: CashAccountTransfer): CashAccountTransfer {
    const values: any = {};
    this.form.cleanMaskAndTransferValuesToBusinessObject(values, true);

    cashAccountTransfer.withdrawalTransaction.cashaccount = this.getCashaccountByIdCashaccountFormPortfolios(this.portfolios,
      values.idDebitCashaccount).cashaccount;

    cashAccountTransfer.withdrawalTransaction.transactionCost = values.transactionCost;
    cashAccountTransfer.depositTransaction.cashaccount = this.getCashaccountByIdCashaccountFormPortfolios(this.portfolios,
      values.idCreditCashaccount).cashaccount;
    cashAccountTransfer.depositTransaction.cashaccountAmount = values.creditAmount;

    if (this.currencypair != null) {
      cashAccountTransfer.withdrawalTransaction.idCurrencypair = this.currencypair.idSecuritycurrency;
      cashAccountTransfer.depositTransaction.idCurrencypair = this.currencypair.idSecuritycurrency;
    }

    cashAccountTransfer.withdrawalTransaction.cashaccountAmount = this.calcDebitAmount(values);

    return cashAccountTransfer;
  }
}