import React, {PureComponent, PropTypes} from 'react';
import classnames from 'classnames';
import {DEBOUNCE_MILLIS} from '../../../common/constants';
import KeyValueEditorRow from './Row';
import {generateId} from '../../../common/misc';
import * as misc from '../../../common/misc';

const NAME = 'name';
const VALUE = 'value';
const ENTER = 13;
const BACKSPACE = 8;
const UP = 38;
const DOWN = 40;
const LEFT = 37;
const RIGHT = 39;

const nullFn = () => null;

class KeyValueEditor extends PureComponent {
  constructor (props) {
    super(props);

    this._focusedPair = null;
    this._focusedField = NAME;
    this._rows = [];

    // Migrate and add IDs to all pairs (pairs didn't used to have IDs)
    const pairs = [...props.pairs];
    for (const pair of pairs) {
      pair.id = pair.id || generateId('pair');
    }

    this.state = {pairs};
  }

  _handlePairChange = pair => {
    const i = this._getPairIndex(pair);
    const pairs = [
      ...this.state.pairs.slice(0, i),
      Object.assign({}, pair),
      ...this.state.pairs.slice(i + 1),
    ];

    this._onChange(pairs);
  };

  _handleMove = (pairToMove, pairToTarget, targetOffset) => {
    if (pairToMove.id === pairToTarget.id) {
      // Nothing to do
      return;
    }

    const withoutPair = this.state.pairs.filter(p => p.id !== pairToMove.id);
    let toIndex = withoutPair.findIndex(p => p.id === pairToTarget.id);

    // If we're moving below, add 1 to the index
    if (targetOffset < 0) {
      toIndex += 1;
    }

    const pairs = [
      ...withoutPair.slice(0, toIndex),
      Object.assign({}, pairToMove),
      ...withoutPair.slice(toIndex),
    ];

    this._onChange(pairs);
  };

  _handlePairDelete = pair => {
    const i = this.state.pairs.findIndex(p => p.id === pair.id);
    this._deletePair(i, true);
  };

  _handleFocusName = pair => {
    this._focusedPair = pair;
    this._focusedField = NAME;
  };

  _handleFocusValue = pair => {
    this._focusedPair = pair;
    this._focusedField = VALUE;
  };

  _handleAddFromName = () => {
    this._focusedField = NAME;
    this._addPair();
  };

  _handleAddFromValue = () => {
    this._focusedField = VALUE;
    this._addPair();
  };

  _handleKeyDown = (pair, e, value) => {
    if (e.metaKey || e.ctrlKey) {
      return;
    }

    if (e.keyCode === ENTER) {
      e.preventDefault();
      this._focusNext(true);
    } else if (e.keyCode === BACKSPACE) {
      if (!value) {
        e.preventDefault();
        this._focusPrevious(true);
      }
    } else if (e.keyCode === DOWN) {
      e.preventDefault();
      this._focusNextPair();
    } else if (e.keyCode === UP) {
      e.preventDefault();
      this._focusPreviousPair();
    } else if (e.keyCode === LEFT) {
      // TODO: Implement this
    } else if (e.keyCode === RIGHT) {
      // TODO: Implement this
    }
  };

  _onChange (pairs) {
    clearTimeout(this._triggerTimeout);
    this._triggerTimeout = setTimeout(() => this.props.onChange(pairs), DEBOUNCE_MILLIS);
    this.setState({pairs});
  }

  _addPair (position, patch) {
    const numPairs = this.state.pairs.length;
    const {maxPairs} = this.props;

    // Don't add any more pairs
    if (maxPairs !== undefined && numPairs >= maxPairs) {
      return;
    }

    position = position === undefined ? numPairs : position;

    const pair = Object.assign({
      name: '',
      value: '',
      id: generateId('pair')
    }, patch);

    const pairs = [
      ...this.state.pairs.slice(0, position),
      pair,
      ...this.state.pairs.slice(position)
    ];

    this._focusedPair = pair;
    this._onChange(pairs);

    this.props.onCreate && this.props.onCreate();
  }

  _deletePair (position, breakFocus = false) {
    if (this._focusedPair >= position) {
      this._focusedPair = breakFocus ? -1 : this._focusedPair - 1;
    }

    const pair = this.state.pairs[position];
    this.props.onDelete && this.props.onDelete(pair);

    const pairs = this.state.pairs.filter((_, i) => i !== position);

    this._onChange(pairs);
  };

  _focusNext (addIfValue = false) {
    if (this._focusedField === NAME) {
      this._focusedField = VALUE;
      this._updateFocus();
    } else if (this._focusedField === VALUE) {
      this._focusedField = NAME;
      if (addIfValue) {
        const i = this._getPairIndex(this._focusedPair);
        this._addPair(i + 1);
      } else {
        this._focusNextPair();
      }
    }
  }

  _focusPrevious (deleteIfEmpty = false) {
    if (this._focusedField === VALUE) {
      this._focusedField = NAME;
      this._updateFocus();
    } else if (this._focusedField === NAME) {
      const p = this._focusedPair;
      if (!p.name && !p.value && !p.fileName && deleteIfEmpty) {
        this._focusedField = VALUE;
        this._deletePair(this._focusedPair);
      } else if (!p.name) {
        this._focusedField = VALUE;
        this._focusPreviousPair();
      }
    }
  }

  _focusNextPair () {
    const i = this._getPairIndex(this._focusedPair);
    if (i >= this.state.pairs.length - 1) {
      this._addPair();
    } else {
      this._focusedPair = this.state.pairs[i + 1];
      this._updateFocus();
    }
  }

  _focusPreviousPair () {
    const i = this._getPairIndex(this._focusedPair);
    if (i > 0) {
      this._focusedPair = this.state.pairs[i - 1];
      this._updateFocus();
    }
  }

  _updateFocus () {
    const row = this._focusedPair && this._rows[this._focusedPair.id];

    if (!row) {
      return;
    }

    if (this._focusedField === NAME) {
      row.focusName();
    } else {
      row.focusValue();
    }
  }

  _getPairIndex (pair) {
    return this.props.pairs.findIndex(p => p.id === pair.id);
  }

  componentDidUpdate () {
    this._updateFocus();
  }

  render () {
    const {
      maxPairs,
      className,
      valueInputType,
      valuePlaceholder,
      namePlaceholder,
      handleRender,
      multipart,
      sortable,
    } = this.props;

    const {
      pairs
    } = this.state;

    const classes = classnames('key-value-editor', 'wide', className);
    return (
      <ul className={classes}>
        {pairs.map((pair, i) => (
          <KeyValueEditorRow
            key={pair.id}
            index={i} // For dragging
            ref={n => this._rows[pair.id] = n}
            sortable={sortable}
            namePlaceholder={namePlaceholder}
            valuePlaceholder={valuePlaceholder}
            valueInputType={valueInputType}
            onChange={this._handlePairChange}
            onDelete={this._handlePairDelete}
            onFocusName={this._handleFocusName}
            onFocusValue={this._handleFocusValue}
            onKeyDown={this._handleKeyDown}
            onMove={this._handleMove}
            handleRender={handleRender}
            multipart={multipart}
            pair={pair}
          />
        ))}

        {!maxPairs || pairs.length < maxPairs ?
          <KeyValueEditorRow
            hideButtons
            sortable
            noDropZone
            readOnly
            className="faded"
            index={-1}
            onChange={nullFn}
            onDelete={nullFn}
            onFocusName={this._handleAddFromName}
            onFocusValue={this._handleAddFromValue}
            multipart={multipart}
            pair={{name: '', value: ''}}
          /> : null
        }
      </ul>
    )
  }
}

KeyValueEditor.propTypes = {
  onChange: PropTypes.func.isRequired,
  pairs: PropTypes.arrayOf(PropTypes.object).isRequired,

  // Optional
  handleRender: PropTypes.func,
  multipart: PropTypes.bool,
  sortable: PropTypes.bool,
  maxPairs: PropTypes.number,
  namePlaceholder: PropTypes.string,
  valuePlaceholder: PropTypes.string,
  valueInputType: PropTypes.string,
  onToggleDisable: PropTypes.func,
  onChangeType: PropTypes.func,
  onChooseFile: PropTypes.func,
  onDelete: PropTypes.func,
  onCreate: PropTypes.func,
};

export default KeyValueEditor;