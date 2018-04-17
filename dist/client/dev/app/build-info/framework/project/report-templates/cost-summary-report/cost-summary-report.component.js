"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
var core_1 = require("@angular/core");
var jsPDF = require("jspdf");
var session_service_1 = require("../../../../../shared/services/session.service");
var constants_1 = require("../../../../../shared/constants");
var CostSummaryReportComponent = (function () {
    function CostSummaryReportComponent() {
        this.currentProjectName = session_service_1.SessionStorageService.getSessionValue(constants_1.SessionStorage.CURRENT_PROJECT_NAME);
    }
    CostSummaryReportComponent.prototype.downloadToPdf = function () {
        var l = {
            orientation: 'l',
            unit: 'mm',
            format: 'a3',
            compress: true,
            fontSize: 8,
            lineHeight: 1,
            autoSize: false,
            printHeaders: true
        };
        var doc = new jsPDF(l, '', '', '');
        var specialElementHandlers = {
            '#editor': function (element, renderer) {
                return true;
            }
        };
        doc.setProperties({
            title: 'Test PDF Document',
            subject: 'This is the subject',
            author: 'author',
            keywords: 'generated, javascript, web 2.0, ajax',
            creator: 'author'
        });
        var content = this.content.nativeElement;
        doc.fromHTML(content.innerHTML, 12, 15, {
            'width': 190,
            'elementHandlers': specialElementHandlers
        });
        doc.cellInitialize();
        doc.margin = 1.5;
        doc.margins = 1.5;
        doc.setFont("courier");
        doc.setFontType("bolditalic");
        doc.setFontSize(9);
        doc.cell(2, 12, 35, 9, 0, 0);
        doc.save('cost-summary-report.pdf');
    };
    __decorate([
        core_1.ViewChild('content'),
        __metadata("design:type", core_1.ElementRef)
    ], CostSummaryReportComponent.prototype, "content", void 0);
    __decorate([
        core_1.Input(),
        __metadata("design:type", Object)
    ], CostSummaryReportComponent.prototype, "buildingReport", void 0);
    __decorate([
        core_1.Input(),
        __metadata("design:type", Object)
    ], CostSummaryReportComponent.prototype, "costingByUnit", void 0);
    __decorate([
        core_1.Input(),
        __metadata("design:type", Object)
    ], CostSummaryReportComponent.prototype, "costingByArea", void 0);
    CostSummaryReportComponent = __decorate([
        core_1.Component({
            moduleId: module.id,
            selector: 'cost-summary-report-pdf',
            templateUrl: 'cost-summary-report.component.html',
        }),
        __metadata("design:paramtypes", [])
    ], CostSummaryReportComponent);
    return CostSummaryReportComponent;
}());
exports.CostSummaryReportComponent = CostSummaryReportComponent;

//# sourceMappingURL=data:application/json;charset=utf8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbImFwcC9idWlsZC1pbmZvL2ZyYW1ld29yay9wcm9qZWN0L3JlcG9ydC10ZW1wbGF0ZXMvY29zdC1zdW1tYXJ5LXJlcG9ydC9jb3N0LXN1bW1hcnktcmVwb3J0LmNvbXBvbmVudC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7OztBQUFBLHNDQUFzRTtBQUN0RSw2QkFBK0I7QUFDL0Isa0ZBQXFGO0FBQ3JGLDZEQUErRDtBQVMvRDtJQU1FO1FBQ0UsSUFBSSxDQUFDLGtCQUFrQixHQUFHLHVDQUFxQixDQUFDLGVBQWUsQ0FBQywwQkFBYyxDQUFDLG9CQUFvQixDQUFDLENBQUM7SUFDdkcsQ0FBQztJQUVELGtEQUFhLEdBQWI7UUFDRSxJQUFJLENBQUMsR0FBRztZQUNOLFdBQVcsRUFBRSxHQUFHO1lBQ2hCLElBQUksRUFBRSxJQUFJO1lBQ1YsTUFBTSxFQUFFLElBQUk7WUFDWixRQUFRLEVBQUUsSUFBSTtZQUNkLFFBQVEsRUFBRSxDQUFDO1lBQ1gsVUFBVSxFQUFFLENBQUM7WUFDYixRQUFRLEVBQUUsS0FBSztZQUNmLFlBQVksRUFBRSxJQUFJO1NBQ25CLENBQUM7UUFFRixJQUFJLEdBQUcsR0FBRyxJQUFJLEtBQUssQ0FBQyxDQUFDLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsQ0FBQztRQUNuQyxJQUFJLHNCQUFzQixHQUFHO1lBQzNCLFNBQVMsRUFBRSxVQUFVLE9BQU8sRUFBRSxRQUFRO2dCQUNwQyxNQUFNLENBQUMsSUFBSSxDQUFDO1lBQ2QsQ0FBQztTQUNGLENBQUM7UUFFRixHQUFHLENBQUMsYUFBYSxDQUFDO1lBQ2hCLEtBQUssRUFBRSxtQkFBbUI7WUFDMUIsT0FBTyxFQUFFLHFCQUFxQjtZQUM5QixNQUFNLEVBQUUsUUFBUTtZQUNoQixRQUFRLEVBQUUsc0NBQXNDO1lBQ2hELE9BQU8sRUFBRSxRQUFRO1NBQ2xCLENBQUMsQ0FBQztRQUVILElBQUksT0FBTyxHQUFHLElBQUksQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDO1FBQ3pDLEdBQUcsQ0FBQyxRQUFRLENBQUMsT0FBTyxDQUFDLFNBQVMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFO1lBQ3RDLE9BQU8sRUFBRSxHQUFHO1lBQ1osaUJBQWlCLEVBQUUsc0JBQXNCO1NBQzFDLENBQUMsQ0FBQztRQUVILEdBQUcsQ0FBQyxjQUFjLEVBQUUsQ0FBQztRQUNyQixHQUFHLENBQUMsTUFBTSxHQUFHLEdBQUcsQ0FBQztRQUNqQixHQUFHLENBQUMsT0FBTyxHQUFHLEdBQUcsQ0FBQztRQUNsQixHQUFHLENBQUMsT0FBTyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3ZCLEdBQUcsQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7UUFDOUIsR0FBRyxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUNuQixHQUFHLENBQUMsSUFBSSxDQUFDLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLENBQUMsRUFBRSxDQUFDLEVBQUUsQ0FBQyxDQUFFLENBQUM7UUFDOUIsR0FBRyxDQUFDLElBQUksQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3RDLENBQUM7SUFsRHFCO1FBQXJCLGdCQUFTLENBQUMsU0FBUyxDQUFDO2tDQUFVLGlCQUFVOytEQUFDO0lBQ2pDO1FBQVIsWUFBSyxFQUFFOztzRUFBcUI7SUFDcEI7UUFBUixZQUFLLEVBQUU7O3FFQUFvQjtJQUNuQjtRQUFSLFlBQUssRUFBRTs7cUVBQW9CO0lBSmpCLDBCQUEwQjtRQU50QyxnQkFBUyxDQUFDO1lBQ1QsUUFBUSxFQUFFLE1BQU0sQ0FBQyxFQUFFO1lBQ25CLFFBQVEsRUFBRSx5QkFBeUI7WUFDbkMsV0FBVyxFQUFFLG9DQUFvQztTQUNsRCxDQUFDOztPQUVXLDBCQUEwQixDQW9EdEM7SUFBRCxpQ0FBQztDQXBERCxBQW9EQyxJQUFBO0FBcERZLGdFQUEwQiIsImZpbGUiOiJhcHAvYnVpbGQtaW5mby9mcmFtZXdvcmsvcHJvamVjdC9yZXBvcnQtdGVtcGxhdGVzL2Nvc3Qtc3VtbWFyeS1yZXBvcnQvY29zdC1zdW1tYXJ5LXJlcG9ydC5jb21wb25lbnQuanMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge0NvbXBvbmVudCwgRWxlbWVudFJlZiwgSW5wdXQsIFZpZXdDaGlsZH0gZnJvbSAnQGFuZ3VsYXIvY29yZSc7XHJcbmltcG9ydCAqIGFzIGpzUERGIGZyb20gJ2pzcGRmJztcclxuaW1wb3J0IHtTZXNzaW9uU3RvcmFnZVNlcnZpY2V9IGZyb20gXCIuLi8uLi8uLi8uLi8uLi9zaGFyZWQvc2VydmljZXMvc2Vzc2lvbi5zZXJ2aWNlXCI7XHJcbmltcG9ydCB7U2Vzc2lvblN0b3JhZ2V9IGZyb20gXCIuLi8uLi8uLi8uLi8uLi9zaGFyZWQvY29uc3RhbnRzXCI7XHJcbi8qLy8vIDxyZWZlcmVuY2UgcGF0aD0nLi4vLi4vLi4vLi4vLi4vLi4vLi4vdG9vbHMvbWFudWFsX3R5cGluZ3MvcHJvamVjdC9qc3BkZi5kLnRzJy8+Ki9cclxuXHJcbkBDb21wb25lbnQoe1xyXG4gIG1vZHVsZUlkOiBtb2R1bGUuaWQsXHJcbiAgc2VsZWN0b3I6ICdjb3N0LXN1bW1hcnktcmVwb3J0LXBkZicsXHJcbiAgdGVtcGxhdGVVcmw6ICdjb3N0LXN1bW1hcnktcmVwb3J0LmNvbXBvbmVudC5odG1sJyxcclxufSlcclxuXHJcbmV4cG9ydCBjbGFzcyBDb3N0U3VtbWFyeVJlcG9ydENvbXBvbmVudCB7XHJcbiAgQFZpZXdDaGlsZCgnY29udGVudCcpIGNvbnRlbnQ6IEVsZW1lbnRSZWY7XHJcbiAgQElucHV0KCkgYnVpbGRpbmdSZXBvcnQ6IGFueTtcclxuICBASW5wdXQoKSBjb3N0aW5nQnlVbml0OiBhbnk7XHJcbiAgQElucHV0KCkgY29zdGluZ0J5QXJlYTogYW55O1xyXG4gIGN1cnJlbnRQcm9qZWN0TmFtZTogc3RyaW5nO1xyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5jdXJyZW50UHJvamVjdE5hbWUgPSBTZXNzaW9uU3RvcmFnZVNlcnZpY2UuZ2V0U2Vzc2lvblZhbHVlKFNlc3Npb25TdG9yYWdlLkNVUlJFTlRfUFJPSkVDVF9OQU1FKTtcclxuICB9XHJcblxyXG4gIGRvd25sb2FkVG9QZGYoKSB7XHJcbiAgICBsZXQgbCA9IHtcclxuICAgICAgb3JpZW50YXRpb246ICdsJyxcclxuICAgICAgdW5pdDogJ21tJyxcclxuICAgICAgZm9ybWF0OiAnYTMnLFxyXG4gICAgICBjb21wcmVzczogdHJ1ZSxcclxuICAgICAgZm9udFNpemU6IDgsXHJcbiAgICAgIGxpbmVIZWlnaHQ6IDEsXHJcbiAgICAgIGF1dG9TaXplOiBmYWxzZSxcclxuICAgICAgcHJpbnRIZWFkZXJzOiB0cnVlXHJcbiAgICB9O1xyXG5cclxuICAgIGxldCBkb2MgPSBuZXcganNQREYobCwgJycsICcnLCAnJyk7XHJcbiAgICBsZXQgc3BlY2lhbEVsZW1lbnRIYW5kbGVycyA9IHtcclxuICAgICAgJyNlZGl0b3InOiBmdW5jdGlvbiAoZWxlbWVudCwgcmVuZGVyZXIpIHtcclxuICAgICAgICByZXR1cm4gdHJ1ZTtcclxuICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBkb2Muc2V0UHJvcGVydGllcyh7XHJcbiAgICAgIHRpdGxlOiAnVGVzdCBQREYgRG9jdW1lbnQnLFxyXG4gICAgICBzdWJqZWN0OiAnVGhpcyBpcyB0aGUgc3ViamVjdCcsXHJcbiAgICAgIGF1dGhvcjogJ2F1dGhvcicsXHJcbiAgICAgIGtleXdvcmRzOiAnZ2VuZXJhdGVkLCBqYXZhc2NyaXB0LCB3ZWIgMi4wLCBhamF4JyxcclxuICAgICAgY3JlYXRvcjogJ2F1dGhvcidcclxuICAgIH0pO1xyXG5cclxuICAgIGxldCBjb250ZW50ID0gdGhpcy5jb250ZW50Lm5hdGl2ZUVsZW1lbnQ7XHJcbiAgICBkb2MuZnJvbUhUTUwoY29udGVudC5pbm5lckhUTUwsIDEyLCAxNSwge1xyXG4gICAgICAnd2lkdGgnOiAxOTAsXHJcbiAgICAgICdlbGVtZW50SGFuZGxlcnMnOiBzcGVjaWFsRWxlbWVudEhhbmRsZXJzXHJcbiAgICB9KTtcclxuXHJcbiAgICBkb2MuY2VsbEluaXRpYWxpemUoKTtcclxuICAgIGRvYy5tYXJnaW4gPSAxLjU7XHJcbiAgICBkb2MubWFyZ2lucyA9IDEuNTtcclxuICAgIGRvYy5zZXRGb250KFwiY291cmllclwiKTtcclxuICAgIGRvYy5zZXRGb250VHlwZShcImJvbGRpdGFsaWNcIik7XHJcbiAgICBkb2Muc2V0Rm9udFNpemUoOSk7XHJcbiAgICBkb2MuY2VsbCgyLCAxMiwgMzUsIDksIDAsIDAgKTtcclxuICAgIGRvYy5zYXZlKCdjb3N0LXN1bW1hcnktcmVwb3J0LnBkZicpO1xyXG4gIH1cclxufVxyXG5cclxuIl19
