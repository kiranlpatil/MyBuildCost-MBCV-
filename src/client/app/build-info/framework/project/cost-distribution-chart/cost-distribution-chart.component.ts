import { AfterViewInit, Component, Input, OnChanges } from '@angular/core';
import { BuildingReport } from '../../model/building-report';
import * as Highcharts from 'highcharts';

@Component({
  moduleId: module.id,
  selector: 'cost-distribution-chart',
  templateUrl: 'cost-distribution-chart.html',
  styleUrls: ['cost-distribution-chart.css'],
})

export class CostDistributionChartComponent implements AfterViewInit, OnChanges {
  @Input() buildingReport: BuildingReport;
  @Input() chartId: number;
  private costsHeadList=new Array(); //TODO
  private notEstimated: number=0;
  private other: number=0;

  ngOnChanges() {
    if (! this.buildingReport)
      return;

    this.costsHeadList=[];
    for (let estimateCost of this.buildingReport.estimate.estimatedCosts) {
      if (estimateCost.total > 0) {
        this.costsHeadList.push([estimateCost.name, estimateCost.total]);
      } else {
        this.notEstimated += this.buildingReport.thumbRule.
          thumbRuleReports[this.buildingReport.estimate.estimatedCosts.indexOf(estimateCost)].amount;
      }
    }
    if (document.getElementById('CostDistributionChart' + this.chartId)) {
      //TODO  find elementId programtically
      this.showCostDistributionChart();
    }
  }

  ngAfterViewInit() {
    this.showCostDistributionChart();
  }

  showCostDistributionChart() {
    let data=this.createDataForChart();
    Highcharts.chart('CostDistributionChart' + this.chartId, {
      chart: {
        plotBackgroundColor: '#f7f7f7',
        plotBorderWidth: 0,
        plotShadow: false,
        colorCount:50
      },
      title: {
        text: this.buildingReport.name+',<br>Construction Cost:<br>'+'(Material+Labour)',
        align: 'center',
        verticalAlign: 'middle'
      },
      tooltip: {
        pointFormat: '<b>{point.percentage:.1f}%</b>'
      },
      plotOptions: {
        pie: {
          dataLabels: {
            enabled: true,
            distance: -50,
            style: {
              fontWeight: 'bold',
              color: 'white'
            }
          },
          showInLegend: true,
          startAngle: 0,
          endAngle: 360,
          center: ['50%', '75%']
        }
      },
      series: [{
        type: 'pie',
        name: 'Cost Distribution',
        innerSize: '50%',
        data: data,
      }],
      legend:{
        layout:'vertical'
      },
      colors: ['#434348', '#3bc698', '#315967', '#6b9bab','#ff9a9e', '#0097ca','#ed4731',
        '#37c2c3', '#f26424', '#a1c4fd','#9ec000','#e7bc00']
    });
  }

  private createDataForChart() {
    this.costsHeadList.sort((a, b)=> {
      return a[1] > b[1] ?-1 : a[1] < b[1] ? 1 : 0;
    });

    let chartData = new Array();
    for(let costHead of this.costsHeadList) {
      if(chartData.length < 10) {
        chartData.push({
          name: costHead[0],
          y: costHead[1],
          dataLabels: {
            enabled: false
          }
        });
      } else {
        this.other += costHead[1];
      }
    }

    if(this.notEstimated > 0) {
      chartData.push({
        name: 'Not Estimated',
        y: this.notEstimated,
        dataLabels: {
          enabled: false
        },
        color:'#e7bc00'
      });
    }

    if(this.other > 0) {
      chartData.push({
        name: 'Other',
        y: this.other,
        dataLabels: {
          enabled: false
        },
        color:'#9ec000'
      });
    }

    return chartData;
  }
}
