export function prompt(ui, opts) {
  ui.create("div", undefined, "prompt");
  let f = ui.e;
  ui.create("span", undefined, "prompt-title").textContent(opts.title).mount(f);
  let keyInputMap = new Map();
  for (let opt of opts.config) {
    ui.create("div", `prompt-opt-${opt.key}`, "prompt-opt").mount(f);
    let p = ui.e;
    ui.create("span", undefined, "prompt-opt-label").textContent(opt.label || opt.key).mount(p);
    let optElement;
    if (opt.type === "select") {
      ui.create("select", undefined, "prompt-opt-select").mount(p);
      let s = ui.e;
      let i = 0;
      for (let value of opt.select) {
        let ii = i; //inner ref to i
        i++;
        ui.create("option", undefined, "prompt-opt-option").mount(s);
        let o = ui.e;
        o.value = ii.toString();
        o.textContent = value;
      }
      optElement = s;
    } else {
      ui.create("input", undefined, "prompt-opt-input").mount(p);
      let inp = ui.e;
      switch (opt.type) {
        case "boolean":
          inp.type = "checkbox";
          inp.value = opt.default.toString();
          break;
        case "color":
          inp.type = "color";
          inp.value = opt.default.toString();
          break;
        case "number":
          inp.type = "number";
          inp.value = opt.default.toString();
          break;
        case "string":
          inp.type = "text";
          inp.value = opt.default.toString();
          break;
        case "color":
          inp.type = "color";
          inp.value = opt.default.toString();
          break;
        case "password":
          inp.type = "password";
          inp.value = opt.default.toString();
          break;
      }
      optElement = inp;
    }
    keyInputMap.set(opt.key, optElement);
  }
  ui.create("div", undefined, "prompt-buttons").mount(f);
  let buttons = ui.e;
  ui.create("button", undefined, "prompt-cancel").textContent(opts.cancelButtonText || "cancel").on("click", () => {
    ui.ref(f);
    ui.unmount();
  }).mount(buttons);
  ui.create("button", undefined, "prompt-submit").textContent(opts.submitButtonText || "submit").on("click", () => {
    let result = {};
    for (let [k, v] of keyInputMap) {
      let value = v.value;
      if (v instanceof HTMLSelectElement) {
        value = Number.parseInt(value);
      } else {
        switch (v.type) {
          case "number":
            value = Number.parseFloat(value);
            break;
          case "checkbox":
            value = value ? true : false;
            break;
        }
      }
      result[k] = value;
    }
    opts.cb(result);
    ui.ref(f);
    ui.unmount();
  }).mount(buttons);
  ui.ref(f);
  ui.mount(ui._doc.body);
  return ui;
}
export function promptAsync(ui, opts) {
  return new Promise(async (_resolve, _reject) => {
    opts.cb = config => {
      _resolve(config);
      return;
    };
    prompt(ui, opts);
  });
}