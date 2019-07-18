import {Component, OnInit} from '@angular/core';
import {NavigationRoutes} from '../../shared/index';
import {Router} from '@angular/router';
import {FormBuilder, FormGroup, Validators} from '@angular/forms';
import {ContactUs} from '../../user/models/contactUs';
import {ContactService1} from './home-page.service';

@Component({
  moduleId: module.id,
  selector: 'home-page',
  templateUrl: 'home-page.component.html',
  styleUrls: ['home-page.component.css'],
})

export class HomePageComponent implements OnInit {
  contactUsForm: FormGroup;
  contactUs: ContactUs;
  model = new ContactUs();
  submitStatus: boolean;
  private isFormSubmitted = false;

  constructor(private formBuilder: FormBuilder, private contactService: ContactService1) {
  }

  ngOnInit(): void {
    this.contactUs = new ContactUs();
    this.intializeForm();
  }

  scrollToSection($element: any) {
    $element.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
      inline: 'nearest'
    });
  }

  intializeForm() {
    this.contactUsForm = this.formBuilder.group({
      emailId: ['', [Validators.required, Validators.minLength(5)]],
      contactNumber: ['', [Validators.required, Validators.minLength(10)]],
      companyName: ['', [Validators.required, Validators.minLength(5)]],
      type: ['', [Validators.required]]
    });
  }

  onSubmit() {
    this.model = this.contactUs;
    if (this.model.emailId === '' || this.model.contactNumber === '' || this.model.companyName === '' || this.model.type === '') {
      this.submitStatus = true;
      return;
    }
    this.model = this.contactUsForm.value;
    this.isFormSubmitted = true;
    this.contactService.contact(this.model).subscribe(res => {
       console.log(res);
    });
  }
}
