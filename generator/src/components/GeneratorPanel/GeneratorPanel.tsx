import { DefaultButton, Panel, PanelType, PrimaryButton } from '@fluentui/react';
import Editor from '@monaco-editor/react';
import * as React from 'react';
import { useRecoilState, useRecoilValue, useSetRecoilState } from 'recoil';
import { AuthenticationType } from '../../models/AuthenticationType';
import { authenticationTypeState } from '../../state/authenticationTypeState';
import { generatorPanelState } from '../../state/generatorPanelState';
import { selectedResourcesState } from '../../state/resourcesState';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import './GeneratorPanel.module.css';
import { ScriptParameter } from '../../models/ScriptParameter';

export interface IGeneratorPanelProps {
}

export const GeneratorPanel: React.FunctionComponent<IGeneratorPanelProps> = (props) => {
  const [isCopied, setIsCopied] = React.useState<boolean>(false);
  const authenticationType = useRecoilValue(authenticationTypeState);
  const [selectedResources] = useRecoilState(selectedResourcesState);
  const setGeneratorPanel = useSetRecoilState(generatorPanelState);

  const buttonStyles = { root: { marginRight: 8 } };

  const _getScriptHeader = () => {
    let scriptHeader = "";
    scriptHeader += `# Generated by Microsoft365DSC from ${window.location.origin} on ${new Date().toLocaleString()}\n`;
    scriptHeader += `# Visit https://microsoft365dsc.com for more information\n`;
    return scriptHeader += "\n"
  }

  const _getParameters = () => {
    var parameters: ScriptParameter[] = [];
    parameters.push({ name: 'Quiet'});
    parameters.push({ name: 'ComponentsToExtract', value: selectedResources.filter((r) => r.checked === true).map((r) => r.name)});

    switch(authenticationType) {
      case AuthenticationType.Credentials :
        parameters.push({ name: 'GlobalAdminAccount', value: '$Credentials'});
        break;
      case AuthenticationType.Application :
        parameters.push({ name: 'ApplicationId', value: '$ApplicationId'});
        parameters.push({ name: 'ApplicationSecret', value: '$ApplicationSecret'});
        parameters.push({ name: 'TenantId', value: '$TenantId'});
        break;
      case AuthenticationType.Certificate :
        parameters.push({ name: 'ApplicationId', value: '$ApplicationId'});
        parameters.push({ name: 'CertificateThumbprint', value: '$CertificateThumbprint'});
        parameters.push({ name: 'TenantId', value: '$TenantId'});
        break;
    }

    return parameters;
  }

  const _getScriptPrompts = () => {
    let scriptPrompts = "";

    switch(authenticationType) {
      case AuthenticationType.Credentials :
        scriptPrompts =   `# Getting client credentials\n`;
        scriptPrompts +=  `$Credentials = Get-Credential\n`
        break;
      case AuthenticationType.Application :
        scriptPrompts =   `# Getting application information for Application + Secret authentication\n`;
        scriptPrompts +=  `$ApplicationId = Read-Host -Prompt 'Application Id'\n`
        scriptPrompts +=  `$ApplicationSecret = Read-Host -Prompt 'Application Secret'\n`
        scriptPrompts +=  `$TenantId = Read-Host -Prompt 'Tenant Id'\n`
        break;
      case AuthenticationType.Certificate :
          scriptPrompts =   `# Getting application information for Application + Certificate authentication\n`;
          scriptPrompts +=  `$ApplicationId = Read-Host -Prompt 'Application Id'\n`
          scriptPrompts +=  `$CertificateThumbprint = Read-Host -Prompt 'Certificate Thumbprint'\n`
          scriptPrompts +=  `$TenantId = Read-Host -Prompt 'Tenant Id'\n`
          break;
    }
    return scriptPrompts += "\n";
  }

  const _getScriptExport = () => {
    let parameters = _getParameters();
    let scriptExport = `# Exporting resources using ${authenticationType}\n`;
    scriptExport += "Export-M365DSCConfiguration";

    parameters.forEach((parameter) => {
      if(parameter.value) {
        if(typeof parameter.value === 'string' || parameter.value instanceof String) {
          scriptExport += ` -${parameter.name} ${parameter.value}`;
        } else if(parameter.value.constructor === Array) {
          scriptExport += ` -${parameter.name} @("${parameter.value.join('", "')}")`;
        }
      } else {
        scriptExport += ` -${parameter.name}`;
      }
    })

    return scriptExport;
  }

  const _getExportScript = () => {
    let scriptHeader = _getScriptHeader();
    let scriptPrompts = _getScriptPrompts();
    let scriptExport = _getScriptExport();

    return scriptHeader.concat(scriptPrompts, scriptExport);
  };

  const _onRenderFooterContent = () => {
    return (
      <div style={{display: 'flex'}}>
        <CopyToClipboard
          text={_getExportScript()}
          onCopy={(text, result) => { setIsCopied(result); }}>
          <PrimaryButton iconProps={{iconName: 'PasteAsCode'}} styles={buttonStyles} disabled={isCopied}>
            {isCopied ? "Copied!" : "Copy to clipboard"}
          </PrimaryButton>
        </CopyToClipboard>
        <DefaultButton onClick={() => setGeneratorPanel(false)}>Cancel</DefaultButton>
      </div>
    )
  }

  return (
    <Panel
      isOpen={true}
      onDismiss={() => setGeneratorPanel(false)}
      type={PanelType.large}
      closeButtonAriaLabel="Close"
      isBlocking={true}
      headerText="Export"
      styles={{content: {overflow: 'hidden', height: 'calc(100%)'}, scrollableContent: {overflow: 'hidden'}}}
      onRenderFooterContent={_onRenderFooterContent}
      isFooterAtBottom={true}
    >
      <Editor
        height="calc(100%)"
        defaultLanguage="powershell"
        theme="light"
        value={_getExportScript()}
        defaultValue={_getExportScript()}
        options={{ wordWrap: 'wordWrapColumn', wordWrapColumn: 120, readOnly: true, minimap: { enabled: false } }}
      />

    </Panel>
  );
};
