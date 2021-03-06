import React, { Component, Children, cloneElement } from 'react';
import PropTypes from 'prop-types';
import './Hint.css';
import generateStyles from './generateStyles';

const m = (...objs) => Object.assign({}, ...objs);

class FlipPage extends Component {
  constructor(props) {
    super(props);

    this.state = {
      page: 0, // current index of page
      startY: -1, // start position of swipe
      diffY: 0, // diffYerence between last swipe position and current position
      timestamp: 0, // time elapsed between two swipes
      angle: 0, // rotate angle of half page
      rotate: 0, // absolute value of above, limited to 45° if necessary
      direction: '', // original swipe direction
      lastDirection: '', // last registered swipe direction
      secondHalfStyle: {}, // transform style of bottom half
      firstHalfStyle: {}, // transform style of top half
      hintVisible: false, // indicates if the hint is visible
    };

    // binding events
    this.startMoving = this.startMoving.bind(this);
    this.moveGesture = this.moveGesture.bind(this);
    this.stopMoving = this.stopMoving.bind(this);
    this.reset = this.reset.bind(this);
    this.mouseLeave = this.mouseLeave.bind(this);
    this.incrementPage = this.incrementPage.bind(this);
    this.decrementPage = this.decrementPage.bind(this);
    this.hasNextPage = this.hasNextPage.bind(this);
    this.hasPreviousPage = this.hasPreviousPage.bind(this);

    this.transition = `transform ${this.props.animationDuration / 1000}s ease-in-out`;
  }

  componentDidMount() {
    const { showHint, showTouchHint } = this.props;

    if (showHint) {
      this.hintTimeout = setTimeout(() => this.showHint(), showTouchHint ? 1800 : 1000);
    }

    if (showTouchHint) {
      this.touchHintTimeout = setTimeout(() => this.showTouchHint(), 1000);
    }
  }

  componentWillUnmount() {
    clearTimeout(this.hintTimeout);
    clearTimeout(this.hintHideTimeout);
    clearTimeout(this.touchHintTimeout);
    clearTimeout(this.touchHintHideTimeout);
  }

  getHeight() {
    return `${this.props.height}px`;
  }

  getHalfHeight() {
    return `${this.props.height / 2}px`;
  }

  getWidth() {
    return `${this.props.width}px`;
  }

  getHalfWidth() {
    return `${this.props.width / 2}px`;
  }

  isLastPage() {
    return this.state.page + 1 === Children.count(this.props.children);
  }

  isFirstPage() {
    return this.state.page === 0;
  }

  showHint() {
    const { orientation, perspective } = this.props;
    const { transition } = this;

    this.setState({ secondHalfStyle: { transition } }, () => {
      this.setState({
        secondHalfStyle: {
          transition,
          transform: orientation === 'vertical' ? `perspective(${perspective}) rotateX(30deg)` : `perspective(${perspective}) rotateY(-30deg)`,
        },
      });

      this.hintHideTimeout = setTimeout(() =>
        this.setState({ secondHalfStyle: { transition } }), 1000);
    });
  }

  showTouchHint() {
    this.setState({ hintVisible: true }, () => {
      this.touchHintHideTimeout = setTimeout(() =>
        this.setState({ hintVisible: false }), 4000);
    });
  }

  incrementPage() {
    const lastPage = Children.count(this.props.children);
    const { page } = this.state;
    this.setState({
      page: (page + 1) % lastPage,
    });
  }

  decrementPage() {
    const lastPage = Children.count(this.props.children);
    const { page } = this.state;
    let nextPage;

    if (this.isFirstPage()) {
      nextPage = lastPage - 1;
    } else {
      nextPage = page - 1;
    }
    this.setState({
      page: nextPage,
    });
  }

  hasNextPage() {
    const { loopForever } = this.props;
    return !this.isLastPage() || loopForever;
  }

  hasPreviousPage() {
    const { loopForever } = this.props;
    return !this.isFirstPage() || loopForever;
  }

  startMoving(e) {
    e.preventDefault();

    const posX = e.pageX || e.touches[0].pageX;
    const posY = e.pageY || e.touches[0].pageY;

    this.setState({
      startX: posX,
      startY: posY,
    });
  }

  moveGesture(e) {
    e.preventDefault();

    const posX = e.pageX || e.touches[0].pageX;
    const posY = e.pageY || e.touches[0].pageY;

    const { orientation, treshold, maxAngle, perspective } = this.props;
    const { startX, startY, diffX, diffY, direction, lastDirection } = this.state;

    if (startY !== -1) {
      const newDiffY = posY - startY;
      const newDiffX = posX - startX;
      const diffToUse = (direction === 'up' || direction === 'down') ? newDiffY : newDiffX;
      const angle = (diffToUse / 250) * 180;
      let useMaxAngle = false;
      if (direction === 'up' || direction === 'left') {
        useMaxAngle = !this.hasNextPage();
      } else if (direction === 'down' || direction === 'right') {
        useMaxAngle = !this.hasPreviousPage();
      }

      const rotate = Math.min(Math.abs(angle), useMaxAngle ? maxAngle : 180);

      let nextDirection = '';

      // determine direction to prevent two-directions swipe
      if (direction === '' && (Math.abs(newDiffX) > treshold || Math.abs(newDiffY) > treshold)) {
        if (newDiffY < 0 && orientation === 'vertical') {
          nextDirection = 'up';
        } else if (newDiffY > 0 && orientation === 'vertical') {
          nextDirection = 'down';
        } else if (newDiffX < 0 && orientation === 'horizontal') {
          nextDirection = 'left';
        } else if (newDiffX > 0 && orientation === 'horizontal') {
          nextDirection = 'right';
        }

        this.setState({ direction: nextDirection });
      }

      // set the last direction
      let nextLastDirection = lastDirection;
      if (diffY > newDiffY) {
        nextLastDirection = 'up';
      } else if (diffY < newDiffY) {
        nextLastDirection = 'down';
      } else if (diffX > newDiffX) {
        nextLastDirection = 'right';
      } else if (diffX < newDiffX) {
        nextLastDirection = 'left';
      }

      this.setState({
        angle,
        rotate,
        timestamp: Date.now(),
        diffY: newDiffY,
        diffX: newDiffX,
        lastDirection: nextLastDirection,
      });

      // flip bottom
      if (newDiffY < 0 && this.state.direction === 'up') {
        this.setState({
          angle,
          secondHalfStyle: {
            transform: `perspective(${perspective}) rotateX(${rotate}deg)`,
          } });
      } else if (newDiffY > 0 && this.state.direction === 'down') {
        this.setState({
          angle,
          firstHalfStyle: {
            transform: `perspective(${perspective}) rotateX(-${rotate}deg)`,
            zIndex: 2, // apply a z-index to pop over the back face
          } });
      } else if (newDiffX < 0 && this.state.direction === 'left') {
        this.setState({
          angle,
          secondHalfStyle: {
            transform: `perspective(${perspective}) rotateY(-${rotate}deg)`,
          } });
      } else if (newDiffX > 0 && this.state.direction === 'right') {
        this.setState({
          angle,
          firstHalfStyle: {
            transform: `perspective(${perspective}) rotateY(${rotate}deg)`,
            zIndex: 2, // apply a z-index to pop over the back face
          },
        });
      }
    }
  }

  gotoNextPage() {
    if (!this.hasNextPage()) return;

    const { perspective, orientation, onPageChange, animationDuration } = this.props;
    const { page } = this.state;
    const { transition } = this;

    let secondHalfTransform = `perspective(${perspective}) `;

    if (orientation === 'vertical') {
      secondHalfTransform += 'rotateX(180deg)';
    } else {
      secondHalfTransform += 'rotateY(-180deg)';
    }

    this.setState({
      firstHalfStyle: {
        transition,
        transform: '',
        zIndex: 'auto',
      },

      secondHalfStyle: {
        transition,
        transform: secondHalfTransform,
      },
    }, () => {
      setTimeout(() => {
        this.incrementPage();
        this.setState({
          secondHalfStyle: {},
        }, () => {
          onPageChange(page);
        });
      }, animationDuration);
    });
  }

  gotoPreviousPage() {
    if (!this.hasPreviousPage()) return;

    const { perspective, orientation, onPageChange, animationDuration } = this.props;
    const { page } = this.state;
    const { transition } = this;

    let firstHalfTransform = `perspective(${perspective}) `;

    if (orientation === 'vertical') {
      firstHalfTransform += 'rotateX(-180deg)';
    } else {
      firstHalfTransform += 'rotateY(180deg)';
    }

    this.setState({
      firstHalfStyle: {
        transition,
        transform: firstHalfTransform,
        zIndex: 2,
      },

      secondHalfStyle: {
        transition,
        transform: '',
      },
    }, () => {
      setTimeout(() => {
        this.decrementPage();
        this.setState({
          firstHalfStyle: {},
        }, () => {
          onPageChange(page);
        });
      }, animationDuration);
    });
  }

  stopMoving() {
    const { timestamp, angle, direction, lastDirection } = this.state;
    const delay = Date.now() - timestamp;

    const goNext = this.hasNextPage() && (
      angle <= -90 ||
        (delay <= 20 && direction === 'up' && lastDirection === 'up') ||
        (delay <= 20 && direction === 'right' && lastDirection === 'right')
    );
    const goPrevious = this.hasPreviousPage() && (
      angle >= 90 ||
        (delay <= 20 && direction === 'down' && lastDirection === 'down') ||
        (delay <= 20 && direction === 'left' && lastDirection === 'left')
    );

    // reset everything
    this.reset();

    if (goNext) {
      this.gotoNextPage();
    }

    if (goPrevious) {
      this.gotoPreviousPage();
    }
  }

  beforeItem() {
    const lastPage = Children.count(this.props.children);
    const { children, firstComponent, loopForever } = this.props;

    if (!this.isFirstPage()) {
      return children[this.state.page - 1];
    }

    return loopForever ? children[lastPage - 1] : firstComponent;
  }

  afterItem() {
    const { children, lastComponent, loopForever } = this.props;

    if (!this.isLastPage()) {
      return children[this.state.page + 1];
    }

    return loopForever ? children[0] : lastComponent;
  }

  mouseLeave() {
    if (this.props.flipOnLeave) {
      this.stopMoving();
    } else {
      this.reset();
    }
  }

  reset() {
    const { transition } = this;

    this.setState({
      startY: -1,
      startX: -1,
      angle: 0,
      rotate: 0,
      direction: '',
      lastDirection: '',
      secondHalfStyle: { transition },
      firstHalfStyle: { transition },
    });
  }

  renderPage(_page, key) {
    const height = this.getHeight();
    const halfHeight = this.getHalfHeight();
    const width = this.getWidth();
    const halfWidth = this.getHalfWidth();

    const complementaryStyle = {
      height,
    };

    const pageItem = cloneElement(_page, {
      style: Object.assign({}, _page.props.style, complementaryStyle),
    });

    const { page, direction, rotate } = this.state;
    const { orientation, uncutPages, maskOpacity, pageBackground, animationDuration } = this.props;
    const style = generateStyles(
      page,
      key,
      direction,
      rotate,
      uncutPages,
      width,
      halfWidth,
      height,
      halfHeight,
      orientation,
      maskOpacity,
      pageBackground,
      animationDuration,
    );

    const {
      container,
      part,
      visiblePart,
      firstHalf,
      secondHalf,
      face,
      back,
      before,
      after,
      cut,
      pull,
      gradient,
      gradientSecondHalfBack,
      gradientFirstHalfBack,
      gradientSecondHalf,
      gradientFirstHalf,
      mask,
      zIndex,
    } = style;

    const beforeItem = this.beforeItem();
    const afterItem = this.afterItem();

    const clonedBeforeItem = beforeItem && cloneElement(beforeItem, {
      style: Object.assign({}, beforeItem.props.style, complementaryStyle),
    });

    const clonedAfterItem = afterItem && cloneElement(afterItem, {
      style: Object.assign({}, afterItem.props.style, complementaryStyle),
    });

    return (
      <div
        role="presentation"
        key={key}
        onMouseDown={this.startMoving}
        onTouchStart={this.startMoving}
        onMouseMove={this.moveGesture}
        onTouchMove={this.moveGesture}
        onMouseUp={this.stopMoving}
        onTouchEnd={this.stopMoving}
        onMouseLeave={this.mouseLeave}
        style={container}
      >
        <div style={m(part, before, cut)}>
          {clonedBeforeItem}
          <div style={mask} />
        </div>
        <div style={m(part, cut, after)}>
          <div style={pull}>{clonedAfterItem}</div>
          <div style={mask} />
        </div>
        <div style={m(part, visiblePart, firstHalf, this.state.firstHalfStyle)}>
          <div style={face}>
            <div style={m(cut, zIndex)}>{pageItem}</div>
            <div style={m(gradient, gradientFirstHalf)} />
          </div>
          <div style={m(face, back)}>
            <div style={cut}>
              <div style={pull}>{clonedBeforeItem}</div>
            </div>
            <div style={m(gradient, gradientFirstHalfBack)} />
          </div>
        </div>
        <div style={m(part, visiblePart, secondHalf, this.state.secondHalfStyle)}>
          <div style={face}>
            <div style={m(cut, zIndex)}>
              <div style={pull}>{pageItem}</div>
            </div>
            <div style={m(gradient, gradientSecondHalf)} />
          </div>
          <div style={m(face, back)}>
            <div style={m(part, after, cut)}>
              {clonedAfterItem}
            </div>
            <div style={m(gradient, gradientSecondHalfBack)} />
          </div>
        </div>
      </div>
    );
  }

  render() {
    const { style, children, className, orientation, showTouchHint } = this.props;

    const containerStyle = m(style, {
      height: this.getHeight(),
      position: 'relative',
      width: this.getWidth(),
    });

    // all the pages are rendered once, to prevent glitching
    // (React would reload the child page and cause a image glitch)
    return (
      <div style={containerStyle} className={className}>
        {Children.map(children, (page, key) => this.renderPage(page, key))}
        {showTouchHint && <div className={`rfp-hint rfp-hint--${orientation}`} />}
      </div>
    );
  }
}

FlipPage.defaultProps = {
  children: [],
  orientation: 'vertical',
  animationDuration: 200,
  treshold: 10,
  maxAngle: 45,
  maskOpacity: 0.4,
  perspective: '130em',
  pageBackground: '#fff',
  firstComponent: null,
  lastComponent: null,
  showHint: false,
  showTouchHint: false,
  uncutPages: false,
  style: {},
  height: 480,
  width: 320,
  onPageChange: () => {},
  className: '',
  flipOnLeave: false,
  loopForever: false, // loop back to first page after last one
};

FlipPage.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.arrayOf(PropTypes.node),
    PropTypes.node,
  ]),
  orientation: (props, propName, componentName) => {
    if (!/(vertical|horizontal)/.test(props[propName])) {
      return new Error(
        `Invalid prop \`${propName}\` supplied to ` +
        ` \`${componentName}\`. Expected \`horizontal\` or \`vertical\`. Validation failed.`,
      );
    }

    return '';
  },
  animationDuration: PropTypes.number,
  treshold: PropTypes.number,
  maxAngle: PropTypes.number,
  maskOpacity: PropTypes.number,
  perspective: PropTypes.string,
  pageBackground: PropTypes.string,
  firstComponent: PropTypes.element,
  flipOnLeave: PropTypes.bool,
  lastComponent: PropTypes.element,
  showHint: PropTypes.bool,
  showTouchHint: PropTypes.bool,
  uncutPages: PropTypes.bool,
  style: PropTypes.any,
  height: PropTypes.number,
  width: PropTypes.number,
  onPageChange: PropTypes.func,
  className: PropTypes.string,
  loopForever: PropTypes.bool,
};

export default FlipPage;
