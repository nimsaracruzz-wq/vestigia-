import { Component,type ReactNode } from 'react';
export default class SectionBoundary extends Component<{children:ReactNode;resetKey:unknown},{failed:boolean}> {
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 componentDidCatch(){console.warn('[Homepage] A section could not render; other content remains available.');}
 componentDidUpdate(previous:Readonly<{children:ReactNode;resetKey:unknown}>){if(previous.resetKey!==this.props.resetKey&&this.state.failed)this.setState({failed:false});}
 render(){return this.state.failed?null:this.props.children;}
}
