function showSecretModal(title,data){$('secretModalTitle').textContent=title;$('secretModalContent').textContent=data;$('secretModal').classList.remove('hidden');state.secretData=data;_pushModal('secret')}
function closeSecretModal(){$('secretModal').classList.add('hidden');if(!_historyRouting)history.back()}
function copySecret(){navigator.clipboard.writeText(state.secretData).then(()=>showToast('Copied!','success'))}
function showSettings(){if(!state.mnemonic){showToast('No recovery phrase available','error');return};showSecretModal('Secret Recovery Phrase',state.mnemonic)}