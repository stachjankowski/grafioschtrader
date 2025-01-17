import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ActivePanelService} from '../../shared/mainmenubar/service/active.panel.service';
import {HelpIds} from '../../shared/help/help.ids';
import {ImportTransactionHead} from '../../entities/import.transaction.head';
import {
  ImportTransactionHeadService,
  SuccessFailedDirectImportTransaction
} from '../service/import.transaction.head.service';
import {ActivatedRoute, Params} from '@angular/router';
import {Securityaccount} from '../../entities/securityaccount';
import {Subscription} from 'rxjs';
import {SecurityaccountImportTransactionTableComponent} from './securityaccount-import-transaction-table.component';
import {CallParam} from '../../shared/maintree/types/dialog.visible';
import {SingleRecordMasterViewBase} from '../../shared/masterdetail/component/single.record.master.view.base';
import {MessageToastService} from '../../shared/message/message.toast.service';
import {ConfirmationService, MenuItem} from 'primeng/api';
import {ParentChildRowSelection} from '../../shared/datashowbase/parent.child.row.selection';
import {ImportTransactionTemplateService} from '../../imptranstemplate/service/import.transaction.template.service';
import {ImportTransactionTemplate} from '../../entities/import.transaction.template';
import {ProcessedAction} from '../../shared/types/processed.action';
import {ProcessedActionData} from '../../shared/types/processed.action.data';
import {CombineTemplateAndImpTransPos} from './combine.template.and.imp.trans.pos';
import {GlobalparameterService} from '../../shared/service/globalparameter.service';
import {plainToClass} from 'class-transformer';
import {DynamicFieldHelper} from '../../shared/helper/dynamic.field.helper';
import {SelectOptionsHelper} from '../../shared/helper/select.options.helper';
import {TranslateHelper} from '../../shared/helper/translate.helper';
import {AppSettings} from '../../shared/app.settings';
import {InfoLevelType} from '../../shared/message/info.leve.type';
import {FileUploadParam} from '../../shared/generaldialog/model/file.upload.param';


/**
 * Main component for the transaction import
 */
@Component({
  template: `
    <div class="data-container" (click)="onComponentClick($event)" #cmDiv
         [ngClass]="{'active-border': isActivated(), 'passiv-border': !isActivated()}">

      <dynamic-form [config]="config" [formConfig]="formConfig" [translateService]="translateService"
                    #form="dynamicForm">
      </dynamic-form>

      <p-contextMenu *ngIf="contextMenuItems" [target]="cmDiv" [model]="contextMenuItems"
                     appendTo="body"></p-contextMenu>
      <br/>
      <securityaccount-import-transaction-table></securityaccount-import-transaction-table>
    </div>

    <securityaccount-import-transaction-edit-head *ngIf="visibleEditDialog"
                                                  [visibleDialog]="visibleEditDialog"
                                                  [callParam]="callParam"
                                                  (closeDialog)="handleCloseEditDialog($event)">
    </securityaccount-import-transaction-edit-head>

    <upload-file-dialog *ngIf="visibleUploadFileDialog"
                        [visibleDialog]="visibleUploadFileDialog"
                        [fileUploadParam]="fileUploadParam"
                        (closeDialog)="handleCloseImportUploadDialog($event)">
    </upload-file-dialog>
  `
})
export class SecurityaccountImportTransactionComponent
  extends SingleRecordMasterViewBase<ImportTransactionHead, CombineTemplateAndImpTransPos>
  implements OnInit, OnDestroy, ParentChildRowSelection<CombineTemplateAndImpTransPos> {

  private static readonly MAIN_FIELD = 'idTransactionHead';

  // Access child components
  @ViewChild(SecurityaccountImportTransactionTableComponent, {static: true}) sitdc: SecurityaccountImportTransactionTableComponent;

  // Child Dialogs
  visibleImportEditHeadDialog = false;
  visibleUploadFileDialog = false;
  fileUploadParam: FileUploadParam;
  callParam: CallParam;
  importTransactionTemplates: ImportTransactionTemplate[];
  successFailedDirectImportTransaction: SuccessFailedDirectImportTransaction;

  seccurityAccount: Securityaccount;

  private routeSubscribe: Subscription;

  constructor(private activatedRoute: ActivatedRoute,
              private importTransactionHeadService: ImportTransactionHeadService,
              private importTransactionTemplateService: ImportTransactionTemplateService,
              gps: GlobalparameterService,
              confirmationService: ConfirmationService,
              messageToastService: MessageToastService,
              activePanelService: ActivePanelService,
              translateService: TranslateService) {

    super(gps, HelpIds.HELP_PORTFOLIO_SECURITYACCOUNT_TRANSACTIONIMPORT,
      SecurityaccountImportTransactionComponent.MAIN_FIELD,
      'IMPORT_SET', importTransactionHeadService, confirmationService, messageToastService, activePanelService,
      translateService);

    this.formConfig = {labelcolumns: 2, nonModal: true};

    this.config = [
      DynamicFieldHelper.createFieldSelectNumber(SecurityaccountImportTransactionComponent.MAIN_FIELD, 'IMPORT_SET_NAME', false,
        {usedLayoutColumns: 6}),
      DynamicFieldHelper.createFieldTextareaInputStringHeqF('note', AppSettings.FID_MAX_LETTERS, false,
        {usedLayoutColumns: 6, disabled: true}),
    ];
    this.configObject = TranslateHelper.prepareFieldsAndErrors(this.translateService, this.config);
  }

  ngOnInit(): void {
    this.routeSubscribe = this.activatedRoute.params.subscribe((params: Params) => {
      this.seccurityAccount = JSON.parse(params[AppSettings.SECURITYACCOUNT.toLowerCase()]);
      this.callParam = new CallParam(this.seccurityAccount, null);
      this.importTransactionTemplateService.getImportTransactionPlatformByTradingPlatformPlan(
        this.seccurityAccount.tradingPlatformPlan.idTradingPlatformPlan, true).subscribe(
        (importTransactionTemplates: ImportTransactionTemplate[]) => {
          this.importTransactionTemplates = importTransactionTemplates;
          if (params[AppSettings.SUCCESS_FAILED_IMP_TRANS]) {
            this.successFailedDirectImportTransaction = JSON.parse(params[AppSettings.SUCCESS_FAILED_IMP_TRANS]);
            this.messageToastService.showMessageI18n(InfoLevelType.ERROR, 'FAILED_TRANS_FROM_IMPORT');
          }
          setTimeout(() => {
            this.valueChangedMainField();
            this.readData();
          });
        });
    });
  }

  readData(): void {
    this.importTransactionHeadService.getImportTransactionHeadBySecurityaccount(this.seccurityAccount.idSecuritycashAccount).subscribe(
      (importTransactionHeads: ImportTransactionHead[]) => {
        this.entityList = plainToClass(ImportTransactionHead, importTransactionHeads);
        this.configObject.idTransactionHead.valueKeyHtmlOptions =
          SelectOptionsHelper.createValueKeyHtmlSelectOptions('idTransactionHead', 'name', importTransactionHeads, true);

        if (!this.selectedEntity && this.successFailedDirectImportTransaction) {
          this.selectedEntity = this.entityList.find(imporTtransactionHead =>
            imporTtransactionHead.idTransactionHead === this.successFailedDirectImportTransaction.idTransactionHead);
        }
        this.setFieldValues();
      });
  }

  setChildData(selectedEntity: ImportTransactionHead): void {
    this.sitdc.parentSelectionChanged(this.selectedEntity, this, this.importTransactionTemplates);
  }


  prepareEditMenu(): MenuItem[] {
    const menuItems: MenuItem[] = this.getBaseEditMenu('IMPORT_SET');

    menuItems.push({separator: true});
    menuItems.push({
      label: 'UPLOAD_CSV' + AppSettings.DIALOG_MENU_SUFFIX,
      disabled: !this.selectedEntity,
      command: (event) => this.handleUploadFiles(this.selectedEntity, 'UPLOAD_CSV', 'csv', false)
    });
    menuItems.push({
      label: 'UPLOAD_PDFS' + AppSettings.DIALOG_MENU_SUFFIX,
      disabled: !this.selectedEntity,
      command: (event) => this.handleUploadFiles(this.selectedEntity, 'UPLOAD_PDFs', 'pdf', true)
    });

    menuItems.push({
      label: 'UPLOAD_TXT_FROM_GT_TRANSFROM' + AppSettings.DIALOG_MENU_SUFFIX,
      disabled: !this.selectedEntity,
      command: (event) => this.handleUploadFiles(this.selectedEntity, 'UPLOAD_TXT_FROM_GT_TRANSFROM', 'txt', false)
    });

    // Add menu items of child data table
    menuItems.push(...this.sitdc.prepareEditMenu());
    TranslateHelper.translateMenuItems(menuItems, this.translateService);

    return menuItems;
  }

  rowSelectionChanged(childEntityList: CombineTemplateAndImpTransPos[], childSelectedEntity: CombineTemplateAndImpTransPos) {
    this.childEntityList = childEntityList;
    this.refreshMenus();
  }

  handleUploadFiles(importTransactionHead: ImportTransactionHead, titleUpload: string, acceptFileType: string, multiple: boolean) {
    this.fileUploadParam = new FileUploadParam(HelpIds.HELP_BASEDATA_IMPORT_TRANSACTION_TEMPLATE,
      acceptFileType, titleUpload, multiple, this.importTransactionHeadService,
      importTransactionHead.idTransactionHead);
    this.visibleUploadFileDialog = true;
  }

  handleCloseImportUploadDialog(processedActionData: ProcessedActionData): void {
    this.visibleUploadFileDialog = false;
    if (processedActionData.action !== ProcessedAction.NO_CHANGE) {
      this.setChildData(this.selectedEntity);
    }
  }

  ngOnDestroy(): void {
    super.destroy();
    this.routeSubscribe && this.routeSubscribe.unsubscribe();
  }

  protected prepareShowMenu(): MenuItem[] {
    const menuItems = this.sitdc.prepareShowMenu();
    TranslateHelper.translateMenuItems(menuItems, this.translateService);
    return menuItems;
  }

  protected prepareCallParm(entity: ImportTransactionHead): void {
    this.callParam.thisObject = entity;
  }

}
