import {ChangeDetectorRef, Component} from '@angular/core';
import {ConfirmationService, FilterService, MenuItem} from 'primeng/api';
import {
  ProgressStateType,
  TaskDataChange,
  TaskDataChangeFormConstraints,
  TaskType
} from '../../../entities/task.data.change';
import {ActivePanelService} from '../../mainmenubar/service/active.panel.service';
import {TranslateService} from '@ngx-translate/core';
import {GlobalparameterService} from '../../service/globalparameter.service';
import {UserSettingsService} from '../../service/user.settings.service';
import {HelpIds} from '../../help/help.ids';
import {DataType} from '../../../dynamic-form/models/data.type';
import {TranslateValue} from '../../datashowbase/column.config';
import {TaskDataChangeService} from '../service/task.data.change.service';
import {CrudMenuOptions, TableCrudSupportMenu} from '../../datashowbase/table.crud.support.menu';
import {MessageToastService} from '../../message/message.toast.service';
import {DialogService} from 'primeng/dynamicdialog';
import {AppSettings} from '../../app.settings';
import {FilterType} from '../../datashowbase/filter.type';
import {combineLatest} from 'rxjs';

@Component({
  template: `
    <div class="data-container" (click)="onComponentClick($event)" #cmDiv
         [ngClass]="{'active-border': isActivated(), 'passiv-border': !isActivated()}">

      <p-table [columns]="fields" [value]="taskDataChangeList" selectionMode="single"
               [(selection)]="selectedEntity" dataKey="idTaskDataChange"
               sortMode="multiple" [multiSortMeta]="multiSortMeta"
               (sortFunction)="customSort($event)" [customSort]="true"
               styleClass="sticky-table p-datatable-striped p-datatable-gridlines">
        <ng-template pTemplate="caption">
          <h4>{{'TASK_DATA_MONITOR' | translate}}</h4>
        </ng-template>
        <ng-template pTemplate="header" let-fields>
          <tr>
            <th style="width:24px"></th>
            <th *ngFor="let field of fields" [pSortableColumn]="field.field" [pTooltip]="field.headerTooltipTranslated"
                [style.width.px]="field.width">
              {{field.headerTranslated}}
              <p-sortIcon [field]="field.field"></p-sortIcon>
            </th>
          </tr>
          <tr *ngIf="hasFilter">
            <th *ngFor="let field of fields" [ngSwitch]="field.filterType" style="overflow:visible;">
              <ng-container *ngSwitchCase="FilterType.likeDataType">
                <ng-container [ngSwitch]="field.dataType">
                  <p-columnFilter *ngSwitchCase="field.dataType === DataType.DateString || field.dataType === DataType.DateNumeric
                              ? field.dataType : ''" [field]="field.field" display="menu" [showOperator]="true"
                                  [matchModeOptions]="customMatchModeOptions" [matchMode]="'gtNoFilter'">
                    <ng-template pTemplate="filter" let-value let-filter="filterCallback">
                      <p-calendar #cal [ngModel]="value" [dateFormat]="baseLocale.dateFormat"
                                  (onSelect)="filter($event)"
                                  monthNavigator="true" yearNavigator="true" yearRange="2000:2099"
                                  (onInput)="filter(cal.value)">
                      </p-calendar>
                    </ng-template>
                  </p-columnFilter>
                  <p-columnFilter *ngSwitchCase="DataType.Numeric" type="numeric" [field]="field.field"
                                  [locale]="formLocale"
                                  minFractionDigits="2" display="menu"></p-columnFilter>
                </ng-container>
              </ng-container>
            </th>
          </tr>
        </ng-template>
        <ng-template pTemplate="body" let-expanded="expanded" let-el let-columns="fields">
          <tr [pSelectableRow]="el">
            <td>
              <a *ngIf="ProgressStateType[el.progressStateType] === ProgressStateType.PROG_FAILED" href="#"
                 [pRowToggler]="el">
                <i [ngClass]="expanded ? 'fa fa-fw fa-chevron-circle-down' : 'fa fa-fw fa-chevron-circle-right'"></i>
              </a>
            </td>
            <td *ngFor="let field of fields" [ngClass]="(field.dataType===DataType.NumericShowZero || field.dataType===DataType.DateTimeNumeric
                || field.dataType===DataType.NumericInteger)? 'text-right': ''">
              <ng-container [ngSwitch]="field.templateName">
                <ng-container *ngSwitchCase="'check'">
                  <span><i [ngClass]="{'fa fa-check': getValueByPath(el, field)}" aria-hidden="true"></i></span>
                </ng-container>
                <ng-container *ngSwitchDefault>
                  <span [pTooltip]="getValueByPath(el, field)"
                        tooltipPosition="top">{{getValueByPath(el, field)}}</span>
                </ng-container>
              </ng-container>
            </td>
          </tr>
        </ng-template>
        <ng-template pTemplate="rowexpansion" let-tdc let-columns="fields">
          <tr>
            <td [attr.colspan]="numberOfVisibleColumns + 1" style="overflow:visible;">
              <h4>{{tdc.failedMessageCode | translate}}</h4>
              <textarea *ngIf="tdc.failedStackTrace" [rows]="getShowLines(tdc.failedStackTrace)">
              {{tdc.failedStackTrace}}
              </textarea>
            </td>
          </tr>
        </ng-template>
      </p-table>
      <p-contextMenu *ngIf="contextMenuItems" [target]="cmDiv" [model]="contextMenuItems"
                     appendTo="body"></p-contextMenu>
    </div>
    <task-data-change-edit *ngIf="visibleDialog"
                           [visibleDialog]="visibleDialog"
                           [callParam]="callParam"
                           [tdcFormConstraints]="tdcFormConstraints"
                           (closeDialog)="handleCloseDialog($event)">
    </task-data-change-edit>
  `,
  styles: ['textarea { width:100%; }'],
  providers: [DialogService]
})
export class TaskDataChangeTableComponent extends TableCrudSupportMenu<TaskDataChange> {

  callParam: TaskDataChange;
  ProgressStateType: typeof ProgressStateType = ProgressStateType;

  contextMenuItems: MenuItem[] = [];
  selectedEntity: TaskDataChange;
  taskDataChangeList: TaskDataChange[];
  editMenu: MenuItem;

  private tdcFormConstraints: TaskDataChangeFormConstraints;

  constructor(private taskDataChangeService: TaskDataChangeService,
              confirmationService: ConfirmationService,
              messageToastService: MessageToastService,
              activePanelService: ActivePanelService,
              dialogService: DialogService,
              changeDetectionStrategy: ChangeDetectorRef,
              filterService: FilterService,
              translateService: TranslateService,
              gps: GlobalparameterService,
              usersettingsService: UserSettingsService) {
    super(AppSettings.TASK_DATE_CHANGE, taskDataChangeService, confirmationService, messageToastService, activePanelService,
      dialogService, changeDetectionStrategy, filterService, translateService, gps, usersettingsService);
  /*
      gps.hasRole(AppSettings.ROLE_ADMIN) ? [CrudMenuOptions.Allow_Create,
        CrudMenuOptions.Allow_Delete] : []);
*/
    this.addColumnFeqH(DataType.DateTimeSecondString, 'creationTime', true, false,
      {filterType: FilterType.likeDataType});
    this.addColumnFeqH(DataType.NumericShowZero, 'taskAsId', true, false,
      {width: 40, maxFractionDigits: 0});
    this.addColumnFeqH(DataType.String, 'idTask', true, false,
      {translateValues: TranslateValue.NORMAL, width: 300});
    this.addColumnFeqH(DataType.DateTimeSecondString, 'earliestStartTime', true, false);
    this.addColumnFeqH(DataType.String, 'entity', true, false,
      {translateValues: TranslateValue.UPPER_CASE});
    this.addColumnFeqH(DataType.NumericInteger, 'idEntity', true, false);
    this.addColumnFeqH(DataType.DateTimeSecondString, 'execStartTime', true, false);
    this.addColumnFeqH(DataType.String, 'executionPriority', true, false,
      {translateValues: TranslateValue.NORMAL});
    this.addColumnFeqH(DataType.DateTimeSecondString, 'execEndTime', true, false);
    this.addColumnFeqH(DataType.String, 'progressStateType', true, false,
      {translateValues: TranslateValue.NORMAL});
    this.addColumnFeqH(DataType.NumericShowZero, 'executionDurationInSeconds', true, false,
      {maxFractionDigits: 0});

    this.fields.filter(f => f.dataType === DataType.DateTimeSecondString).map(f => f.width = 100);

    this.multiSortMeta.push({field: 'creationTime', order: -1});
    this.multiSortMeta.push({field: 'taskAsId', order: 1});

    this.prepareTableAndTranslate();
  }

  getShowLines(text: string): number {
    return Math.min((text.match(/\n/g) || '').length + 1, 15);
  }


  prepareCallParm(entity: TaskDataChange): void {
    this.callParam = entity;
  }

  protected readData(): void {
    combineLatest([this.taskDataChangeService.getAllTaskDataChange(), this.taskDataChangeService.getFormConstraints()]).subscribe(data => {
      this.taskDataChangeList = data[0];
      this.tdcFormConstraints = data[1];
      this.prepareTableAndTranslate();
      this.createTranslatedValueStoreAndFilterField(this.taskDataChangeList);
    });
  }

  getHelpContextId(): HelpIds {
    return HelpIds.HELP_TASK_DATA_CHANGE_MONITOR;
  }

  protected addCustomMenusToSelectedEntity(taskDataChange: TaskDataChange, menuItems: MenuItem[]): void {
    if (this.gps.hasRole(AppSettings.ROLE_ADMIN)) {
      menuItems.push({
        label: 'COPY_RECORD|' + this.entityNameUpper,
        command: (event) => this.copyTaskDataChange(taskDataChange),
        disabled: taskDataChange.idTask > this.tdcFormConstraints.maxUserCreateTask
      });
    }
  }

  private copyTaskDataChange(taskDataChange: TaskDataChange): void {
    const taskDataChangeNew = Object.assign(new TaskDataChange(), {
      idTask: taskDataChange.idTask,
      entity: taskDataChange.entity, idEntity: taskDataChange.idEntity
    });
    this.prepareCallParm(taskDataChangeNew);
    this.visibleDialog = true;
  }

}
