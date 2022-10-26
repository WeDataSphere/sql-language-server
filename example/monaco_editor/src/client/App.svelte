<script>
  import {
    executeSwitchDatabaseCommand,
    executeFixAllFixableProblemsCommand,
    executeChangeAssociationCommand,
    executeWorkspaceConfig,
    getConnectionList,
    getCurrecntConnection,
  } from './client'

  const commands = [
    { id: 'fixAllFixableProblems', text: 'fixAllFixableProblems' },
    { id: 'switchDatabaseConnection', text: 'switchDatabaseConnection' },
    { id: 'changeAssociation', text: 'changeAssociation' },
  ]

  let command = commands[0]

  function handleSubmitCommand() {
    if (command.id === 'fixAllFixableProblems') {
      executeFixAllFixableProblemsCommand()
    } else if (command.id === 'switchDatabaseConnection') {
      executeSwitchDatabaseCommand(connection)
    } else if (command.id === 'changeAssociation') {
      executeChangeAssociationCommand(associationName)
    }
  }

  let associationName = ''
  let associations = ['open','close']
  let connectionList = []
  let connection = ''
  function handleChangeCommand() {
    connectionList = getConnectionList()
    connection = getCurrecntConnection()
  }
</script>

<h1>Monaco Language Client SQLLanguageServer Sample</h1>

<form on:submit|preventDefault={handleSubmitCommand}>
  <select bind:value={command} on:change={handleChangeCommand}>
    {#each commands as command}
      <option value={command}>
        {command.text}
      </option>
    {/each}
  </select>
  {#if command.id === 'switchDatabaseConnection'}
    <select bind:value={connection}>
      {#each connectionList as con}
        <option value={con}>
          {con}
        </option>
      {/each}
    </select>
  {/if}
  {#if command.id === 'changeAssociation'}
    <select bind:value={associationName}>
      {#each associations as asso}
        <option value={asso}>
          {asso}
        </option>
      {/each}
    </select>
  {/if}
  <button type=submit>Submit</button>
</form>

<div id="container" style="width:800px;height:600px;border:1px solid grey"></div>
