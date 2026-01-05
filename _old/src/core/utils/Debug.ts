/** This class provides Debug Utilities. */
declare global {
  interface Window {
    realConsoleError?: (...args: any[]) => void;
  }
}
class Debug {
  safari: boolean = false;
  mobile: boolean = false;

  /** Reroute Console Errors to the Main Screen (for mobile) */
  constructor() {
    // Intercept Main Window Errors as well
    window.realConsoleError = console.error;
    window.addEventListener('error', (event) => {
      let path = event.filename.split("/");
      this.display((path[path.length - 1] + ":" + event.lineno + " - " + event.message));
    });
    console.error = this.fakeError.bind(this);

    // Record whether we're on Safari or Mobile (unused so far)
    this.safari = /(Safari)/g.test(navigator.userAgent) && ! /(Chrome)/g.test(navigator.userAgent);
    this.mobile = /(Android|iPad|iPhone|iPod|Oculus)/g.test(navigator.userAgent) || this.safari;
  }

  // Log Errors as <div>s over the main viewport
  fakeError(...args: any[]): void {
    if (args.length > 0 && args[0]) { this.display(JSON.stringify(args[0])); }
    if (window.realConsoleError) {
      window.realConsoleError.apply(console, arguments as any);
    }
  }

  display(text: string): void {
    //if (this.mobile) {
    let errorNode = window.document.getElementById("error");
    errorNode.innerHTML += "\n\n" + text.fontcolor("red");
    //window.document.getElementById("info").appendChild(errorNode);
    //}
  }

}

export { Debug };
let debug = new Debug();
