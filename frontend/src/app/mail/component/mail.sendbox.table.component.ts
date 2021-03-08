import {ChangeDetectorRef, Component, OnDestroy} from '@angular/core';
import {DialogService} from 'primeng/dynamicdialog';
import {ConfirmDialogModule} from 'primeng/confirmdialog';
import {ConfirmationService} from 'primeng/api';
import {MailInOutTable} from './mail.in.out.table';
import {MailInbox} from '../model/mail.inbox';
import {MailInboxService} from '../service/mail.inbox.service';
import {Router} from '@angular/router';
import {MessageToastService} from '../../shared/message/message.toast.service';
import {ActivePanelService} from '../../shared/mainmenubar/service/active.panel.service';
import {TranslateService} from '@ngx-translate/core';
import {GlobalparameterService} from '../../shared/service/globalparameter.service';
import {UserSettingsService} from '../../shared/service/user.settings.service';
import {DataType} from '../../dynamic-form/models/data.type';
import {plainToClass} from 'class-transformer';
import {MailSendboxService} from '../service/mail.sendbox.service';
import {MailSendbox} from '../model/mail.sendbox';


@Component({
  templateUrl: '../view/mail.in.out.table.html',
  providers: [DialogService]
})
export class MailSendboxTableComponent extends MailInOutTable<MailSendbox> implements OnDestroy {
  constructor(private mailSendboxService: MailSendboxService,
              router: Router,
              confirmationService: ConfirmationService,
              messageToastService: MessageToastService,
              activePanelService: ActivePanelService,
              dialogService: DialogService,
              changeDetectionStrategy: ChangeDetectorRef,
              translateService: TranslateService,
              globalparameterService: GlobalparameterService,
              usersettingsService: UserSettingsService) {
    super(router, 'sendTime', 'MailSendbox', mailSendboxService, confirmationService, messageToastService, activePanelService,
      dialogService, changeDetectionStrategy, translateService, globalparameterService, usersettingsService);
    this.addColumnFeqH(DataType.String, 'idUserTo', true, false, {width: 50});
    this.addColumnFeqH(DataType.String, 'roleNameTo', true, false,
      {width: 80, translateValues: true});
    this.addColumnFeqH(DataType.DateTimeString, 'sendTime', true, false, {width: 80});
    this.addColumnFeqH(DataType.String, 'subject', true, false);
    this.prepareTableAndTranslate();
  }

  ngOnDestroy(): void {
    this.activePanelService.destroyPanel(this);
  }

  readData(): void {
    this.mailSendboxService.getAllSendboxByUser().subscribe(mails => {
      this.entityList = plainToClass(MailSendbox, mails);
      this.createTranslatedValueStoreAndFilterField(this.entityList);
      this.refreshSelectedEntity();
    });
  }

}