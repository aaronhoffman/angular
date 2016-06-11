import {Directive, Inject, Optional, Self, forwardRef} from '@angular/core';

import {EventEmitter, ObservableWrapper, PromiseWrapper} from '../../facade/async';
import {ListWrapper} from '../../facade/collection';
import {isPresent} from '../../facade/lang';
import {AbstractControl, FormControl, FormGroup} from '../model';
import {NG_ASYNC_VALIDATORS, NG_VALIDATORS} from '../validators';

import {ControlContainer} from './control_container';
import {Form} from './form_interface';
import {NgControl} from './ng_control';
import {NgControlGroup} from './ng_control_group';
import {composeAsyncValidators, composeValidators, setUpControl, setUpFormGroup} from './shared';

export const formDirectiveProvider: any =
    /*@ts2dart_const*/ {provide: ControlContainer, useExisting: forwardRef(() => NgForm)};

/**
 * If `NgForm` is bound in a component, `<form>` elements in that component will be
 * upgraded to use the Angular form system.
 *
 * ### Typical Use
 *
 * Include `FORM_DIRECTIVES` in the `directives` section of a {@link View} annotation
 * to use `NgForm` and its associated controls.
 *
 * ### Structure
 *
 * An Angular form is a collection of `FormControl`s in some hierarchy.
 * `FormControl`s can be at the top level or can be organized in `FormGroup`s
 * or `FormArray`s. This hierarchy is reflected in the form's `value`, a
 * JSON object that mirrors the form structure.
 *
 * ### Submission
 *
 * The `ngSubmit` event signals when the user triggers a form submission.
 *
 * ### Example ([live demo](http://plnkr.co/edit/ltdgYj4P0iY64AR71EpL?p=preview))
 *
 *  ```typescript
 * @Component({
 *   selector: 'my-app',
 *   template: `
 *     <div>
 *       <p>Submit the form to see the data object Angular builds</p>
 *       <h2>NgForm demo</h2>
 *       <form #f="ngForm" (ngSubmit)="onSubmit(f.value)">
 *         <h3>Control group: credentials</h3>
 *         <div ngControlGroup="credentials">
 *           <p>Login: <input type="text" ngControl="login"></p>
 *           <p>Password: <input type="password" ngControl="password"></p>
 *         </div>
 *         <h3>Control group: person</h3>
 *         <div ngControlGroup="person">
 *           <p>First name: <input type="text" ngControl="firstName"></p>
 *           <p>Last name: <input type="text" ngControl="lastName"></p>
 *         </div>
 *         <button type="submit">Submit Form</button>
 *       <p>Form data submitted:</p>
 *       </form>
 *       <pre>{{data}}</pre>
 *     </div>
 * `,
 *   directives: [CORE_DIRECTIVES, FORM_DIRECTIVES]
 * })
 * export class App {
 *   constructor() {}
 *
 *   data: string;
 *
 *   onSubmit(data) {
 *     this.data = JSON.stringify(data, null, 2);
 *   }
 * }
 *  ```
 *
 *  @experimental
 */
@Directive({
  selector: 'form:not([ngNoForm]):not([formGroup]),ngForm,[ngForm]',
  providers: [formDirectiveProvider],
  host: {
    '(submit)': 'onSubmit()',
  },
  outputs: ['ngSubmit'],
  exportAs: 'ngForm'
})
export class NgForm extends ControlContainer implements Form {
  private _submitted: boolean = false;

  form: FormGroup;
  ngSubmit = new EventEmitter();

  constructor(
      @Optional() @Self() @Inject(NG_VALIDATORS) validators: any[],
      @Optional() @Self() @Inject(NG_ASYNC_VALIDATORS) asyncValidators: any[]) {
    super();
    this.form = new FormGroup(
        {}, null, composeValidators(validators), composeAsyncValidators(asyncValidators));
  }

  get submitted(): boolean { return this._submitted; }

  get formDirective(): Form { return this; }

  get control(): FormGroup { return this.form; }

  get path(): string[] { return []; }

  get controls(): {[key: string]: AbstractControl} { return this.form.controls; }

  addControl(dir: NgControl): FormControl {
    const ctrl = new FormControl();
    PromiseWrapper.scheduleMicrotask(() => {
      const container = this._findContainer(dir.path);
      setUpControl(ctrl, dir);
      container.registerControl(dir.name, ctrl);
      ctrl.updateValueAndValidity({emitEvent: false});
    });
    return ctrl;
  }

  getControl(dir: NgControl): FormControl { return <FormControl>this.form.find(dir.path); }

  removeControl(dir: NgControl): void {
    PromiseWrapper.scheduleMicrotask(() => {
      var container = this._findContainer(dir.path);
      if (isPresent(container)) {
        container.removeControl(dir.name);
      }
    });
  }

  addFormGroup(dir: NgControlGroup): void {
    PromiseWrapper.scheduleMicrotask(() => {
      var container = this._findContainer(dir.path);
      var group = new FormGroup({});
      setUpFormGroup(group, dir);
      container.registerControl(dir.name, group);
      group.updateValueAndValidity({emitEvent: false});
    });
  }

  removeFormGroup(dir: NgControlGroup): void {
    PromiseWrapper.scheduleMicrotask(() => {
      var container = this._findContainer(dir.path);
      if (isPresent(container)) {
        container.removeControl(dir.name);
      }
    });
  }

  getFormGroup(dir: NgControlGroup): FormGroup { return <FormGroup>this.form.find(dir.path); }

  updateModel(dir: NgControl, value: any): void {
    PromiseWrapper.scheduleMicrotask(() => {
      var ctrl = <FormControl>this.form.find(dir.path);
      ctrl.updateValue(value);
    });
  }

  onSubmit(): boolean {
    this._submitted = true;
    ObservableWrapper.callEmit(this.ngSubmit, null);
    return false;
  }

  /** @internal */
  _findContainer(path: string[]): FormGroup {
    path.pop();
    return ListWrapper.isEmpty(path) ? this.form : <FormGroup>this.form.find(path);
  }
}