import { Component, OnInit, Inject, ChangeDetectorRef, AfterViewInit } from '@angular/core';
import { FormGroup, FormControl, Validators } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ViewEncapsulation } from '@angular/core';
import * as moment from 'moment';
import { BackendService } from '../../../shared/services/backend.service';
import { Idea } from '../../../shared/models/idea.model';
import { ModalController } from '@ionic/angular';

@Component({
  selector: 'app-task-entry',
  templateUrl: './task-entry.component.html',
  styleUrls: ['./task-entry.component.scss'],
  encapsulation: ViewEncapsulation.Emulated
})
export class TaskEntryComponent implements AfterViewInit {

 

    taskForm = new FormGroup({
      day: new FormControl(1,[Validators.required, Validators.min(1), Validators.max(5)]), 
      description: new FormControl("",[]), 
      minutes: new FormControl(10,[Validators.required, Validators.min(0)]), 
      priority: new FormControl(2,[Validators.required, Validators.min(0), Validators.max(5)]), 
      urgency: new FormControl(2,[Validators.required, Validators.min(0), Validators.max(5)]), 
      difficulties: new FormControl(2,[Validators.required, Validators.min(0), Validators.max(5)]), 
      resource: new FormControl("",[]), 
      title: new FormControl("",[Validators.required, Validators.maxLength(37)]),
      tag: new FormControl("general",[Validators.required])
      
    }
  )

  difficultyLevel: number = 1;
  priorityLevel: number = 1;
  urgencyLevel: number = 1;

  ideas:Idea[] = [];
  ideaSub;



  priorities = [
    {
      text: "Not Important", 
      number: 1
    },
    { 
      text: "Low Priority", 
      number: 2
    },
    {
      text: "Important", 
      number: 3
    },
    {
      text: "Very Important", 
      number: 4
    },
    {
      text: "Critical",
      number: 5
    }
  ]

  
  difficulty = [
    {
      text: "Mindless", 
      number: 1
    },
    {
      text: "Easy", 
      number: 2
    },
    {
      text: "Average", 
      number: 3
    },
    {
      text: "Involved", 
      number: 4
    },
    {
      text: "Deep Focus",
      number: 5
    }
  ]

  urgencyLevels = [
    {
      text: "Not Urgent", 
      number: 1
    },
    {
      text: "Somewhat Urgent", 
      number: 2
    },
    {
      text: "Urgent", 
      number: 3
    },
    {
      text: "Very Urgent", 
      number: 4
    },
    { 
      text: "Get it Done Now!",
      number: 5
    }
  ]
  
  constructor(
    public modalController: ModalController,
    private cd: ChangeDetectorRef,
    private backend: BackendService,
   ) { }

  ngAfterViewInit(): void {
    this.ideaSub = this.backend
                       .getIdeas()
                       .valueChanges()
                       .subscribe(i => this.ideas = i);
  }

  useIdea(idea) {
    this.taskForm.controls['title'].setValue(idea.title);
    this.backend.deleteIdea(idea);
  }

  submitTask() {
    // console.dir(this.title);-
    console.log("Task is being submitted");
    this.modalController.dismiss({
      id: this.idGenerator(),
      completed: 0,
      day: this.day.value,
      description: this.description.value,
      minutes: this.minutes.value,
      priority: this.priority.value,
      difficulty: this.difficulties.value,
      urgency: this.urgency.value,
      resource: this.resource.value,
      title: this.title.value,
      createdDate: moment().format("MM/DD/YYYY"),
      tag: this.tag.value,
      pastDue: 0
    })
  }

  cancel() {
    console.log(`Cancelled!`);
    this.modalController.dismiss({
      'dismissed':true
    })
  }

  get day() { return this.taskForm.get('day');}
  get description() { return this.taskForm.get('description');}
  get minutes() { return this.taskForm.get('minutes');}
  get priority() { return this.taskForm.get('priority');}
  get urgency() { return this.taskForm.get('urgency');}
  get difficulties() { return this.taskForm.get('difficulties');}
  get resource() { return this.taskForm.get('resource');}
  get title() { return this.taskForm.get('title');}
  get tag() { return this.taskForm.get('tag');}

  idGenerator() {
    var S4 = function() {
       return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
    };
    return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
}



  ngOnDestroy() {
    if(this.ideaSub) this.ideaSub.unsubscribe();
  }

}


