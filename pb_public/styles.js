export function styles(ui) {
  ui.create("style").id("yarr-styles").style({
    "body": {
      backgroundColor: "#181818",
      color: "white",
      fontFamily: "Arial, Helvetica, sans-serif"
    },
    ".prompt": {
      backgroundImage: "url(./textures/blue.svg)",
      backgroundSize: "100%",
      backgroundPosition: "50% 50%",
      backgroundRepeat: "no-repeat",
      backgroundColor: "#2f2bb8",
      position: "absolute",
      width: "50%",
      height: "50%",
      left: "25%",
      top: "25%",
      flexDirection: "column",
      // backgroundColor: "#333333e3",
      padding: "1em",
      borderRadius: "1em",
      borderWidth: "1px",
      borderStyle: "solid",
      borderColor: "black"
    },
    ".prompt-title": {
      textAlign: "center",
      marginBottom: "auto"
    },
    // ".prompt > .prompt-opt:nth-child(2n+1)": {
    //   backgroundColor: "#2d2c2c"
    // },
    ".prompt-opt": {
      maxHeight: "2em",
      padding: "0.1em",
      margin: "0.2em",
      textIndent: "1em",
      borderRadius: "2em"
    },
    ".prompt-opt-label": {
      alignSelf: "center"
    },
    ".prompt-opt-input, .prompt-opt-select": {
      backgroundColor: "#090b174f",
      color: "inherit",
      borderStyle: "solid",
      borderWidth: "1px",
      borderColor: "black",
      maxWidth: "60%",
      marginLeft: "auto",
      borderRadius: "2em",
      height: "2.5em",
      width: "100%"
    },
    ".prompt-opt-input": {
      textIndent: "1em"
    },
    ".prompt-buttons": {
      marginTop: "auto",
      //place at end of container
      maxHeight: "2em"
    },
    ".prompt-submit, .prompt-cancel": {
      backgroundColor: "#00000044",
      color: "inherit",
      maxHeight: "2em",
      borderRadius: "1em",
      marginLeft: "0.5em",
      marginRight: "0.5em"
    },
    ".prompt-submit:hover": {
      backgroundColor: "#1c4eff"
    },
    ".prompt-cancel:hover": {
      backgroundColor: "#dc9321"
    }
  });
}