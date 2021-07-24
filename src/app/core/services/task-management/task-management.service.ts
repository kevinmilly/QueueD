import { Injectable } from '@angular/core';

import * as moment from "moment";
import { ModalController } from '@ionic/angular';
import { BehaviorSubject, forkJoin, Observable, Subscription } from 'rxjs';

import { Task } from '../../../shared/models/task.model';
import { Goal } from 'src/app/shared/models/goal.model';

import { BackendService } from '../backend/backend.service';
import { FormControl } from '@angular/forms';
import { TaskEntryComponent } from 'src/app/presentational/ui/task-entry/task-entry.component';
import { ShowAwardComponent } from 'src/app/presentational/display/show-award/show-award.component';


import { GoalEntryComponent } from 'src/app/presentational/ui/goal-entry/goal-entry.component';
import { map, tap } from 'rxjs/operators';
import { AuthRedoneService } from '../auth/authredone.service';
import { ItemEditComponent } from 'src/app/presentational/ui/item-edit/item-edit.component';
import { MilestoneEntryComponent } from 'src/app/presentational/ui/milestone-entry/milestone-entry.component';
import { DateTimeEntryComponent } from 'src/app/presentational/ui/date-time-entry/date-time-entry.component';
import { combineLatest } from 'rxjs';
import { SettingsComponent } from 'src/app/presentational/ui/settings/settings.component';




@Injectable({
  providedIn: 'root'
})
export class TaskManagementService {


  private tasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject([]);
  private allTasksSubject: BehaviorSubject<Task[]> = new BehaviorSubject([]);
  private goalsSubject: BehaviorSubject<Goal[]> = new BehaviorSubject([]);
  private defaultHoursSubject: BehaviorSubject<number> = new BehaviorSubject(5);

  public allTasks$: Observable<Task[]> = this.allTasksSubject.asObservable();
  public allTasksCompleted$: Observable<Task[]> = this.allTasksSubject.asObservable();
  public tasks$: Observable<Task[]> = this.tasksSubject.asObservable();
  public goals$: Observable<Goal[]> = this.goalsSubject.asObservable();
  public defaultHours$: Observable<number> = this.defaultHoursSubject.asObservable();




  defaultHours = 5;

  private tags = ['general', 'All'];
  tagOptions = new FormControl('general', []);

  ideaForm;
  ideas;


  constructor(
    private backend: BackendService,
    private auth: AuthRedoneService,
    public modalController: ModalController,

  ) {



  }

  public init(): void {
    console.log(`in init with ${this.defaultHours}`);
    this.goals$ = this.backend.getGoalsFromDB().valueChanges();
    this.allTasks$ = combineLatest([
                        this.backend.getTasksFromDB().valueChanges(),
                        this.defaultHours$
                      ]).pipe(
                            map(([unincrementedTasks,hours]) => this.incrementDaysForTasks(hours, unincrementedTasks)),
                            map(tasks => this.calculateTasksPastDue(tasks))
                       );

      const tempTask$ = this.allTasks$
      .pipe(map(tasks => tasks.filter(t => !t.completed)));
      this.tasks$ = combineLatest([tempTask$, this.goals$])
        .pipe(
          map(([tasks, goals]) => this.prioritizeAdhocAndGoalRelatedTasks(tasks, goals)),
        )
        .pipe(
          tap(t => {
            t[0].forEach(t => {
              if (t.tag && !this.tags.find(currentTag => currentTag === t.tag)) this.tags.push(t.tag)
            });
          })
        );


  }



  calculateTasksPastDue(tasks: Task[]) {
    return tasks.map(t => {
      return {
        ...t,
        pastDue: t.pastDue + this.dateDifference(new Date(), new Date(t.createdDate))
      }
    });
  }


  prioritizeAdhocAndGoalRelatedTasks(t, g) {

    const nonGoalTasks = t.filter(t => !t.goalId);
    t = nonGoalTasks
      .concat(this.goalRelatedTaskPrioritize(t.filter(t => t.goalId), g))
      .filter(task => task.completed === 0)
      .sort((a, b) => (b.priority + b.difficulty + b.urgency + b.pastDue) - (a.priority + a.difficulty + a.urgency + a.pastDue));

    return [t, g];
  }

  goalRelatedTaskPrioritize(goalRelatedTasks: Task[], goals: Goal[]) {
    if (goals.length === 0) return []; //no need to find goal related tasks if they don't exist

    const parentGoalsSortedByPriority = goals
      .filter(goal => !goal.completed && goal.parentGoal === null)
      .sort((a, b) => {
        return (b.priority + b.difficulty + b.urgency) - (a.priority + a.difficulty + a.urgency);
      })


    const sortedMilestonesOfHighestGoal = goals
      .filter(goal => !goal.completed &&
        goal.parentGoal === parentGoalsSortedByPriority[0].id)
      .sort((a, b) => {
        return (b.priority + b.difficulty + b.urgency) - (a.priority + a.difficulty + a.urgency);
      })

    const list = goalRelatedTasks.filter(t => t.goalId === sortedMilestonesOfHighestGoal[0].id);

    return list;

  }


  incrementDaysForTasks(hours: number, taskList: Task[]) {
    let dayIterator = 1;
    const minutesADay = hours * 60;
    let remainingMinutes = minutesADay;
    const nonCompletedTasks = taskList.filter(t => !t.completed);
    for (let i = 0, len = nonCompletedTasks.length; i < len; i++) {

      if ((remainingMinutes - nonCompletedTasks[i].minutes) >= -1) {
        remainingMinutes -= nonCompletedTasks[i].minutes;
        nonCompletedTasks[i].day = dayIterator;
      } else {
        nonCompletedTasks[i].day = ++dayIterator;
        remainingMinutes = minutesADay;

      }

    }
    return nonCompletedTasks;
  }



  createIdea(event) {
    this.backend.addIdea({ title: event.title, createdDate: moment().format("MM/DD/YYYY") });
    this.backend.delete(event);
  }

  markTaskComplete(event) {
    event.completed = 1;
    event.completedDate = moment().format('MM/DD/YYYY');
    event.completedTime = moment().format('hA');

    this.updateAllTasks(event);
    this.handleGoalUpdates(this.tasks$, this.goals$);

  }


  async addInitialTask() {
    const modal = await this.modalController.create({
      component: TaskEntryComponent,
      cssClass: 'task-entry'
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        // if (result.id) this.backend.addMetric(this.backend.addTask(result), "creation")

      });


    return await modal.present();

  }

  async addTask(milestone?: Goal, goal?: Goal) {
    const modal = await this.modalController.create({
      component: TaskEntryComponent
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        if (result.id) {
          if (goal) {
            result['goalId'] = milestone.id;
            result['parentGoalTitle'] = goal.title;
            result['milestoneTitle'] = milestone.title;

          }
          this.backend.addTask(result);

        }

      });


    return await modal.present();

  }

  async updateSettings() {
    console.log("Update reached to task management");
    console.log(this.defaultHours);
    const modal = await this.modalController.create({
      component: SettingsComponent,
      componentProps: { 
        hourSettings: this.defaultHours
      },
      cssClass: 'auto-height',
      showBackdrop: true,
      mode: "ios"
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        if (!result.dismissed) {
          this.defaultHours = result;
          this.defaultHoursSubject.next(this.defaultHours);

        }

      });


    return await modal.present();
  }

  async addGoal() {
    const modal = await this.modalController.create({
      component: GoalEntryComponent,
      cssClass: 'goal-entry'
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];

        if (result) {
          const returnedGoals = this.backend.addGoals(result.goalsToSubmit);
          const returnedTasks = this.backend.addTasks(result.tasksToSubmit);

        }

      });
    return await modal.present();

  }

  async addMilestone(goalParent) {
    const modal = await this.modalController.create({
      component: MilestoneEntryComponent,
      cssClass: 'goal-entry',
      componentProps: { goalParent }
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        if (result !== null) {
          const returnedGoals = this.backend.addGoals(result.goalToSubmit);
          const returnedTasks = this.backend.addTasks(result.tasksToSubmit);
        }

      });


    return await modal.present();

  }

  editGoal(goalToEdit) {
    const returnItem = this.backend.updateGoalsInDB([goalToEdit]);
  }

  async editItem(data, type) {

    const modal = await this.modalController.create({
      component: ItemEditComponent,
      cssClass: 'goal-entry',
      componentProps: { data, type }
    });
    modal.onDidDismiss()
      .then((data) => {

        const result = data.data;
        if (result) {
          switch (type) {
            case 'task':
              const returnItem = this.backend.updateTask(result);
              break;
            case 'goal':
              this.backend.updateGoalsInDB([result]);
              break;
          }

          // this.sortDays(5,[...this.tasks]);
        }
      });

    return await modal.present();

  }

  deleteTask(event) {
    const returnItem = this.backend.delete(event);
  }

  deleteGoal(g, m) {

    let tasks;

    m.forEach(g => {
      tasks = g.tasks;
      tasks.forEach((t) => {
        this.backend.delete(t);
      });

      this.backend.deleteGoal(g)
    });

    this.backend.deleteGoal(g);



  }

  updateAllTasks(event) {
    this.backend.updateTasksInDB([event]);

  }


  dateDifference(d1, d2) {
    const diff = moment(d1).diff(moment(d2), 'days');
    return diff || 0;
  }

  handleGoalUpdates(tasks$: Observable<Task[]>, goals$: Observable<Goal[]>) {

    return forkJoin([tasks$, goals$])
      .subscribe(([tasks, goals]) => {
        const goalsToUpdate = [];
        let currentGoal;
        const milestones = goals.filter(g => g.taskChildren.length > 0);
        milestones
          .forEach(m => {
            m.completed = this.checkIfMilestoneDone(m.id, [...tasks], [...milestones]);
            currentGoal = goals.find(g => g.id === m.parentGoal);
            currentGoal.completed = this.checkIfGoalDone(m, [...goals]);
            if (m.completed) goalsToUpdate.push(m);
            if (currentGoal.completed) goalsToUpdate.push(currentGoal);

          });

        this.backend.updateGoalsInDB([...goalsToUpdate]);
      })

  }

  checkIfMilestoneDone(milestoneId: string, tasks: Task[], goals: Goal[]): number {
    let currentTask;
    let complete = 1;
    const milestoneToCheck = goals.find(goal => goal.id === milestoneId);
    milestoneToCheck.taskChildren.forEach(currentTaskId => {
      currentTask = tasks.find(task => task.id === currentTaskId);
      if (currentTask && !currentTask.completed) {
        complete = 0;
        return complete;
      }
    })

    return complete;

  }

  checkIfGoalDone(associatedMilestone: Goal, goals: Goal[]): number {

    let complete = 1;
    const goalToCheck = goals.find(goal => goal.id === associatedMilestone.parentGoal);
    const milestoneToCheck = goals.filter(goal => goal.parentGoal === goalToCheck.id)

    milestoneToCheck
      .forEach(milestone => {
        if (!milestone.completed) {
          complete = 0;
          return complete;
        }
      })
    return complete;

  }

  async showAwards() {
    const modal = await this.modalController.create({
      component: ShowAwardComponent,
      // cssClass: 'show-award'
    });

    return await modal.present();

  }

  async createEvent(tasks) {
    const modal = await this.modalController.create({
      component: DateTimeEntryComponent
    });
    modal.onDidDismiss()
      .then((data) => {
        const result = data['data'];
        if (result.date) {

          try {
            this.auth.insertEvents(tasks, result.date, result.buffer);

          } catch (error) {
            console.dir(error);
          }


        }

      });


    return await modal.present();

  }


  get loggedIn() {
    return !!this.auth.user;
  }

  get filterTags() {
    return this.tags;
  }


}
