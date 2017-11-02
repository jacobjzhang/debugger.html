// @flow
import React, { PureComponent } from "react";
import ReactDOM from "react-dom";
import { bindActionCreators } from "redux";
import { connect } from "react-redux";
import CloseButton from "../shared/Button/Close";
import "./ConditionalPanel.css";
import { toEditorLine } from "../../utils/editor";
import actions from "../../actions";
import { SourceEditor } from "devtools-source-editor";

import {
  getSelectedLocation,
  getBreakpointForLine,
  getConditionalPanelLine
} from "../../selectors";

type Props = {
  breakpoint: Object,
  selectedLocation: Object,
  setBreakpointCondition: Function,
  line: number,
  editor: Object,
  openConditionalPanel: () => void,
  closeConditionalPanel: () => void
};

function createEditor() {
  return new SourceEditor({
    mode: "javascript",
    foldGutter: false,
    enableCodeFolding: false,
    readOnly: false,
    lineNumbers: false,
    theme: "mozilla",
    styleActiveLine: false,
    lineWrapping: false,
    matchBrackets: false,
    showAnnotationRuler: false,
    gutters: [],
    value: " ",
    extraKeys: {
      // Override code mirror keymap to avoid conflicts with split console.
      Esc: false,
      "Cmd-F": false,
      "Cmd-G": false
    }
  });
}

export class ConditionalPanel extends PureComponent<Props> {
  cbPanel: null | Object;
  input: ?HTMLInputElement;

  constructor() {
    super();
    this.cbPanel = null;
  }

  keepFocusOnInput() {
    if (this.input) {
      this.input.focus();
    }
  }

  saveAndClose = () => {
    if (this.input) {
      this.setBreakpoint(this.input.value);
    }

    this.props.closeConditionalPanel();
  };

  onKey = (e: SyntheticKeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      this.saveAndClose();
    } else if (e.key === "Escape") {
      this.props.closeConditionalPanel();
    }
  };

  setBreakpoint(condition: string) {
    const { selectedLocation, line } = this.props;
    const sourceId = selectedLocation ? selectedLocation.sourceId : "";
    const location = { sourceId, line };
    return this.props.setBreakpointCondition(location, { condition });
  }

  clearConditionalPanel() {
    if (this.cbPanel) {
      this.cbPanel.clear();
      this.cbPanel = null;
    }
  }

  componentWillUpdate(nextProps: Props) {
    if (nextProps.line) {
      return this.renderToWidget(nextProps);
    }
    return this.clearConditionalPanel();
  }

  renderToWidget(props: Props) {
    const { selectedLocation, line, editor } = props;
    const sourceId = selectedLocation ? selectedLocation.sourceId : "";

    const editorLine = toEditorLine(sourceId, line);
    this.cbPanel = editor.codeMirror.addLineWidget(
      editorLine,
      this.renderConditionalPanel(props),
      {
        coverGutter: true,
        noHScroll: true
      }
    );
    editor.editor.refresh();
    this.cbPanel.node.querySelector(".panel-mount textarea").focus();
  }

  renderConditionalPanel(props: Props) {
    const { breakpoint } = props;
    const condition = breakpoint ? breakpoint.condition : "";
    const panel = document.createElement("div");
    ReactDOM.render(
      <div
        className="conditional-breakpoint-panel"
        onClick={() => this.keepFocusOnInput()}
        onBlur={this.props.closeConditionalPanel}
      >
        <div className="prompt">»</div>
        <div className="panel-mount" />
        <CloseButton
          handleClick={this.props.closeConditionalPanel}
          buttonClass="big"
          tooltip={L10N.getStr("editor.conditionalPanel.close")}
        />
      </div>,
      panel
    );

    const editor = createEditor();
    editor._initShortcuts = () => {};
    editor.appendToLocalElement(panel.querySelector(".panel-mount"));

    return panel;
  }

  render() {
    return null;
  }
}

export default connect(
  state => {
    const line = getConditionalPanelLine(state);
    const selectedLocation = getSelectedLocation(state);
    return {
      selectedLocation,
      breakpoint: getBreakpointForLine(state, selectedLocation.sourceId, line),
      line
    };
  },
  dispatch => bindActionCreators(actions, dispatch)
)(ConditionalPanel);
