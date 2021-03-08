import {ChangeDetectionStrategy, ChangeDetectorRef, Component, ElementRef, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {TranslateService} from '@ngx-translate/core';
import {ActivePanelService} from '../../mainmenubar/service/active.panel.service';
import {ActivatedRoute} from '@angular/router';
import {IGlobalMenuAttach} from '../../mainmenubar/component/iglobal.menu.attach';
import {ViewSizeChangedService} from '../../layout/service/view.size.changed.service';
import {Subscription} from 'rxjs';
import {ChartDataService} from '../service/chart.data.service';
import {ChartData, PlotlyHelper} from '../plotly.helper';
import {HelpIds} from '../../help/help.ids';
import {PlotlyLocales} from '../../plotlylocale/plotly.locales';
import {GlobalparameterService} from '../../service/globalparameter.service';
import {PlotlyService} from 'angular-plotly.js';


/**
 * This general purpose chart does not have a certain layout, it can be a pie or other type of chart. After the
 * creation it makes a call back to requested the data for the registered id. Advantage: once open it can
 * receive its data over subscription.
 */
@Component({
  template: `
    <div class="fullChart" [ngClass]="{'active-border': isActivated(), 'passiv-border': !isActivated()}"
         (click)="onComponentClick($event)">
      <div #chart class="plot-container">
      </div>
    </div>
  `,
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ChartGeneralPurposeComponent implements OnInit, OnDestroy, IGlobalMenuAttach {
  @ViewChild('chart', {static: true}) chartElement: ElementRef;

  private subscriptionViewSizeChanged: Subscription;
  private subscriptionChartDataChanged: Subscription;
  private routeSubscribe: Subscription;
  private chartData: ChartData;

  constructor(private plotlyService: PlotlyService,
              private globalparameterService: GlobalparameterService,
              private translateService: TranslateService,
              private chartDataService: ChartDataService,
              private viewSizeChangedService: ViewSizeChangedService,
              private activePanelService: ActivePanelService,
              private activatedRoute: ActivatedRoute,
              private changeDetectionStrategy: ChangeDetectorRef) {
  }

  ngOnInit(): void {
    this.activePanelService.registerPanel(this);
    const config = PlotlyLocales.setPlotyLocales(this.plotlyService.getPlotly(), this.globalparameterService);
    config.displaylogo = false;

    this.subscriptionChartDataChanged = this.chartDataService.chartDataChanged$.subscribe((chartData: ChartData) => {
      chartData.options = Object.assign({}, chartData.options, config);
      this.chartData = chartData;
      this.plotOrRePlot();

      if (!this.subscriptionViewSizeChanged) {
        this.subscriptionViewSizeChanged = this.viewSizeChangedService.viewSizeChanged$.subscribe(changedViewSizeType =>
          this.plotOrRePlot());
      }

    });

    this.routeSubscribe = this.activatedRoute.params.subscribe(params => {
      this.chartDataService.requestDataForChart(params['id']);
    });
  }


  private plotOrRePlot(): void {
    // Plotly.Plots.resize(this.el.nativeElement));
    this.plotlyService.getPlotly().purge(this.chartElement.nativeElement);
    this.plotlyService.getPlotly().newPlot(this.chartElement.nativeElement, this.chartData.data, this.chartData.layout,
      this.chartData.options);
    if (this.chartData.callBackFN) {
      PlotlyHelper.registerPlotlyClick(this.chartElement.nativeElement, this.chartData.callBackFN);
    }
  }

  isActivated(): boolean {
    return this.activePanelService.isActivated(this);
  }


  hideContextMenu(): void {
  }

  callMeDeactivate(): void {
    this.changeDetectionStrategy.markForCheck();
  }

  onComponentClick(event): void {
    this.activePanelService.activatePanel(this);
  }

  public getHelpContextId(): HelpIds {
    // TODO return ID depending on the chart
    return null;
  }


  ngOnDestroy(): void {
    this.routeSubscribe && this.routeSubscribe.unsubscribe();
    this.subscriptionChartDataChanged && this.subscriptionChartDataChanged.unsubscribe();
    this.subscriptionViewSizeChanged && this.subscriptionViewSizeChanged.unsubscribe();
    this.activePanelService.destroyPanel(this);
  }
}