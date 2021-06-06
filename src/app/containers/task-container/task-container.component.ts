import { Component, OnInit, Input, Output, EventEmitter } from '@angular/core';
import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Task } from '../../shared/models/task.model';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { ModalController, ToastController } from '@ionic/angular';
import { TaskEntryComponent } from 'src/app/presentational/ui/task-entry/task-entry.component';
import { CommentsService } from 'src/app/core/services/comments/comments.service';



@Component({
  selector: 'app-task-container',
  templateUrl: './task-container.component.html',
  styleUrls: ['./task-container.component.scss']
})
export class TaskContainerComponent implements OnInit {

  @Input() tasks: Task[] = [];
  @Input() deviceSize: string = '';

  @Output() markedComplete: EventEmitter<Task> = new EventEmitter<Task>();
  @Output() taskUpdate = new EventEmitter();
  @Output() editTaskEmitter: EventEmitter<Task> = new EventEmitter<any>();
  @Output() deleteTask: EventEmitter<Task> = new EventEmitter<Task>();
  @Output() createdIdea: EventEmitter<Task> = new EventEmitter<Task>();

  panelOpenState: boolean = false;
  toolTipOptions = {
    'placement': 'left',
    'hide-delay': -300
  }

  quotes;

  constructor(
    public modalController: ModalController,
    private commentService: CommentsService,
    public toastController: ToastController
  ) { }

  ngOnInit(): void {
    this.quotes = this.commentService.encouragement;
  }


  getRandomQuote() {
    this.presentToast(this.quotes[Math.floor(Math.random() * (this.quotes.length))]);
  }



  async presentToast(message) {
    const toast = await this.toastController.create({
      message: message,
      duration: 2000
    });
    toast.present();
  }

  async presentTwoPartToast(main, sub) {
    const toast = await this.toastController.create({
      header: main,
      message: sub,
      duration: 2000
    });
    toast.present();
  }



  markComplete(task: Task) {
    this.getRandomQuote();
    this.markedComplete.emit(task);
  }

  delete(task: Task) {
    if (confirm("Do you legit wanna delete this?")) {
      this.getRandomQuote();
      this.deleteTask.emit(task);
    }

  }

  async editComplete(task: Task) {

    const modal = await this.modalController.create({
      component: TaskEntryComponent,
      componentProps: { data: task },
      cssClass: 'task-entry'
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        if (result) this.editTaskEmitter.emit(result);
      });

    return await modal.present();
  }

  editTask(event) {
    this.editTaskEmitter.emit(event);
  }


  createIdea(task: Task) {
    this.createdIdea.emit(task);
  }

  classPriority(priority, difficulty, urgency, pastDue) {
    if ((priority + difficulty + urgency + pastDue) < 4 || (priority + difficulty + urgency + pastDue) === 4) {
      return 'task-item-very-low'
    } else if ((priority + difficulty + urgency + pastDue) < 7 || (priority + difficulty + urgency + pastDue) === 7) {
      return 'task-item-low';
    } else if ((priority + difficulty + urgency + pastDue) < 10 || (priority + difficulty + urgency + pastDue) === 10) {
      return 'task-item-medium';
    } else if ((priority + difficulty + urgency + pastDue) < 12 || (priority + difficulty + urgency + pastDue) === 12) {
      return 'task-item-high';
    } else {
      return 'task-item-very-high';
    }

  }

  getHeight(task) {
    return `${(task.difficulty + task.priority + task.urgency + task.pastDue) / 2}rem`;
  }

  importanceDifficultyFormat(format, number) {
    if (format === 'importance') {
      switch (number) {
        case 1:

          return `Very Low`;
        case 2:

          return `Low`;
        case 3:

          return `Moderate`;
        case 4:

          return `High`;
        case 5:

          return `Very High`;
        default:

          return `Very High`;
      }
    } else if (format === 'difficulty') {
      switch (number) {
        case 1:

          return `Very Low`;
        case 2:

          return `Low`;
        case 3:

          return `Moderate`;
        case 4:

          return `High`;
        case 5:

          return `Very High`;
        default:

          return `Very High`;
      }
    } else {

      switch (number) {
        case 1:

          return `Very Low`;
        case 2:

          return `Low`;
        case 3:

          return `Moderate`;
        case 4:

          return `High`;
        case 5:

          return `Very High`;
        default:

          return `Very High`;
      }
    }

  }

}
